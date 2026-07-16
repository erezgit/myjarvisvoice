import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls, ContactShadows, Bounds, Center } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { Send } from "lucide-react";
import { audioManager } from "./audioManager";

const API = "http://localhost:3001";
useGLTF.preload("/models/pudu.glb");
useGLTF.preload("/models/pudu-anim.glb");

// Shared cursor (normalized -1..1), so the Pudu can look toward you.
const cursor = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
    cursor.y = (e.clientY / window.innerHeight) * 2 - 1;
  });
}

function Pudu() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/pudu.glb");        // mesh + skeleton + 29 morphs
  const { animations } = useGLTF("/models/pudu-anim.glb"); // 18 clips
  const model = useMemo(() => cloneSkeleton(scene), [scene]);
  const { actions } = useAnimations(animations, group);

  // The skinned mesh that carries the eye blendshapes.
  const face = useMemo(() => {
    let m: THREE.Mesh | null = null;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.morphTargetDictionary) m = mesh;
    });
    return m;
  }, [model]);

  const setMorph = (name: string, v: number) => {
    const dict = face?.morphTargetDictionary;
    const infl = face?.morphTargetInfluences;
    if (dict && infl && name in dict) infl[dict[name]] = v;
  };

  // Idle base animation; swap to a livelier one while speaking.
  const prev = useRef<THREE.AnimationAction | null>(null);
  const playClip = (name: string) => {
    const a = actions[name];
    if (!a || prev.current === a) return;
    a.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.4).play();
    prev.current?.fadeOut(0.4);
    prev.current = a;
  };
  useEffect(() => { playClip("Idle_A"); }, [actions]);

  const blink = useRef({ t: 0, next: 2 + Math.random() * 3, v: 0, phase: "idle" as "idle" | "close" | "open" });
  const excited = useRef(0);

  useFrame((state, dt) => {
    const amp = audioManager.getAmplitude();

    // Blink.
    const b = blink.current;
    b.t += dt;
    if (b.phase === "idle" && b.t >= b.next) { b.phase = "close"; b.t = 0; }
    if (b.phase === "close") { b.v += dt * 12; if (b.v >= 1) { b.v = 1; b.phase = "open"; } }
    else if (b.phase === "open") { b.v -= dt * 9; if (b.v <= 0) { b.v = 0; b.phase = "idle"; b.next = 2 + Math.random() * 3; } }
    setMorph("eyes.blink", b.v);

    // Excited/happy eyes while talking, eased in and out, pulsing with the voice.
    const target = audioManager.isPlaying() ? 0.45 + amp * 0.55 : 0;
    excited.current += (target - excited.current) * 0.12;
    setMorph("eyes.excited-1", excited.current);

    // Look toward the cursor (whole-body turn + gentle vertical morphs).
    if (inner.current) {
      const ty = -cursor.x * 0.5;
      const tx = cursor.y * 0.12;
      inner.current.rotation.y += (ty - inner.current.rotation.y) * 0.06;
      inner.current.rotation.x += (tx - inner.current.rotation.x) * 0.06;
    }
    setMorph("eyes.lookDown", Math.max(0, cursor.y) * 0.5);
    setMorph("eyes.lookUp", Math.max(0, -cursor.y) * 0.5);

    // Stay grounded — no jumping. A whisper-soft breathing scale is the only
    // body motion; all the life is in the eyes.
    if (inner.current) {
      inner.current.position.y = 0;
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.006 + amp * 0.01;
      inner.current.scale.setScalar(breathe);
    }
  });

  // Face the camera: the model's native forward is +X, so yaw -90°, then a
  // slight turn for a friendly 3/4 view.
  return (
    <group ref={group} rotation={[0, -Math.PI / 2 + 0.35, 0]}>
      <group ref={inner}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export function PalPage() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const latestIdRef = useRef<number>(0);

  // The pet speaks new voice messages while you're on his page (no-interrupt).
  useEffect(() => {
    fetch(`${API}/api/voice_messages`)
      .then((r) => r.json())
      .then((m: { id: number }[]) => { if (m.length) latestIdRef.current = m[0].id; })
      .catch(() => {});
    const es = new EventSource(`${API}/api/events`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.resource !== "voice_messages") return;
      fetch(`${API}/api/voice_messages`)
        .then((r) => r.json())
        .then((m: { id: number; audio_path: string }[]) => {
          if (m.length && m[0].id > latestIdRef.current) {
            latestIdRef.current = m[0].id;
            if (!audioManager.isPlaying()) audioManager.play(`${API}${m[0].audio_path}`);
          }
        })
        .catch(() => {});
    };
    return () => es.close();
  }, []);

  const talkToPal = () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    const voice = localStorage.getItem("voice-pal-voice") || "nova";
    fetch(`${API}/api/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, voice, agent: "Pal" }),
    })
      .then(() => setText(""))
      .catch(() => {})
      .finally(() => setSending(false));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="shrink-0 px-5 pt-6 pb-3">
        <h1 className="text-xl font-semibold text-foreground">Desktop Pal</h1>
        <p className="text-sm text-muted-foreground mt-1">Your little buddy. He lights up when you talk.</p>
      </div>

      <div className="relative flex-1 min-h-0 mx-4 rounded-3xl overflow-hidden bg-gradient-to-b from-amber-100 to-rose-100 dark:from-indigo-950/60 dark:to-neutral-950">
        <Canvas camera={{ position: [0, 0.95, 4.8], fov: 34 }} dpr={[1, 2]} shadows>
          <hemisphereLight args={[0xffffff, 0x8899aa, 2.2]} position={[0, 5, 0]} />
          <directionalLight position={[3, 6, 4]} intensity={2.4} castShadow />
          <directionalLight position={[-4, 3, -2]} intensity={0.6} color="#bcd4ff" />
          <Suspense fallback={null}>
            <Bounds fit clip margin={1.15}>
              <Center>
                <Pudu />
              </Center>
            </Bounds>
            <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={5} blur={2.6} far={4} />
          </Suspense>
          <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={10} enableDamping dampingFactor={0.08} />
        </Canvas>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-4">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && talkToPal()}
            placeholder="Say something to your Pal…"
            className="flex-1 h-10 px-3.5 rounded-full border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#58a6ff]"
          />
          <button
            onClick={talkToPal}
            disabled={!text.trim() || sending}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#58a6ff] text-white disabled:opacity-40 hover:bg-[#4795e6] transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

PalPage.path = "/voice-pal/pal";
