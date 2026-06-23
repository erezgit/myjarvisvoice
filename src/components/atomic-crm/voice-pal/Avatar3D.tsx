import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

function Robot({ isSpeaking }: { isSpeaking: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/robot.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    // Play idle or wave animation
    const idleAction = actions["Idle"];
    const waveAction = actions["Wave"];
    const danceAction = actions["Dance"];

    if (isSpeaking && danceAction) {
      idleAction?.fadeOut(0.3);
      danceAction.reset().fadeIn(0.3).play();
    } else if (idleAction) {
      danceAction?.fadeOut(0.3);
      idleAction.reset().fadeIn(0.3).play();
    }
  }, [isSpeaking, actions]);

  // Gentle floating motion
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05 - 0.8;
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return <primitive ref={group} object={scene} scale={0.35} position={[0, -0.5, 0]} />;
}

export function Avatar3D({ isSpeaking = false }: { isSpeaking?: boolean }) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1f3c 100%)" }}>
      <Canvas camera={{ position: [0, 0.2, 3.5], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-3, 3, 2]} intensity={0.5} color="#58a6ff" />
        <Robot isSpeaking={isSpeaking} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} />
      </Canvas>
    </div>
  );
}
