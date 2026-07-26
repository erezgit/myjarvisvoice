/**
 * audioManager — the single playback engine for voice messages.
 *
 * ONE <audio> element is the source of truth. The auto-play of a new message,
 * every VoicePlayerInline progress bar, and the 3D Pal's mouth all read from
 * this one object, so sound and UI can never disagree.
 *
 * Two hazards this module exists to contain:
 *
 * 1. THE ANALYSER MUST NEVER BE ABLE TO MUTE PLAYBACK.
 *    `createMediaElementSource(el)` is IRREVERSIBLE and reroutes the element's
 *    output away from the speakers into the Web Audio graph. If the
 *    AudioContext is suspended — which is its default state until a user
 *    gesture — the sound goes into a stalled graph and you hear NOTHING, even
 *    though the element reports playing and currentTime advances. That is
 *    exactly what breaks AUTO-play (no gesture) while manual clicking still
 *    works (a click is a gesture that resumes the context).
 *    → We only rewire once the context is verifiably `running`. Until then the
 *      element stays connected straight to the speakers and simply plays.
 *
 * 2. A WEDGED ELEMENT MUST NEVER BLOCK THE NEXT MESSAGE.
 *    Auto-play is gated on `isPlaying()`. An element told to play whose media
 *    never arrives (404, server blip, half-written file) stays NON-paused
 *    forever, so a naive `!paused` gate shuts permanently and every later
 *    message is skipped in silence.
 *    → `isPlaying()` treats "not paused but no progress for STALL_MS" as not
 *      playing, and unwedges the element.
 */

const audio = new Audio();
// Lets the analyser read the cross-origin (:3001) stream once the graph exists;
// the voice server sends Access-Control-Allow-Origin: *, so it is not tainted.
audio.crossOrigin = "anonymous";

// ── Listeners ───────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((fn) => fn());
}

// ── Stall detection ─────────────────────────────────────────────────────────
const STALL_MS = 10_000;
let lastProgressAt = 0;
const markProgress = () => {
  lastProgressAt = Date.now();
};

// ── "Playback actually started" ─────────────────────────────────────────────
// Distinct from "we asked it to play". Callers must only record a message as
// heard when sound genuinely began, otherwise a silent failure still marks it
// played and it never shows as new again.
const startedSrcs = new Set<string>();

audio.addEventListener("play", markProgress);
audio.addEventListener("playing", () => {
  markProgress();
  if (audio.src) startedSrcs.add(audio.src);
  notify();
});
audio.addEventListener("timeupdate", () => {
  markProgress();
  notify();
});
audio.addEventListener("play", notify);
audio.addEventListener("pause", notify);
audio.addEventListener("ended", notify);
audio.addEventListener("loadedmetadata", notify);
audio.addEventListener("error", () => {
  console.warn("[audioManager] error on", audio.src, audio.error?.message);
  lastProgressAt = 0;
  notify();
});
audio.addEventListener("stalled", () => {
  console.warn("[audioManager] stalled on", audio.src);
});

// ── Optional analyser graph (for the 3D Pal) ────────────────────────────────
// Built ONLY when the AudioContext is already running. See hazard 1 above.
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let ampBuf: Uint8Array | null = null;
let graphReady = false;
let graphImpossible = false;
let smoothedAmp = 0;
let smoothedWide = 0;

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctx();
  } catch {
    graphImpossible = true;
  }
  return audioCtx;
}

/**
 * Try to build the analyser graph. Safe to call every frame — it is a no-op
 * once built, once proven impossible, or while the context is still suspended.
 * Crucially it does NOT rewire the element while suspended, because doing so
 * would silence playback.
 */
function tryBuildGraph(): void {
  if (graphReady || graphImpossible) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state !== "running") {
    // Ask politely; a gesture-less resume may be refused, and that is fine —
    // we simply leave the element wired straight to the speakers.
    ctx.resume().catch(() => {});
    return;
  }

  try {
    const source = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    ampBuf = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    graphReady = true;
  } catch {
    // createMediaElementSource throws if called twice on one element. Never
    // retry — a failed attempt must not leave audio half-routed.
    graphImpossible = true;
  }
}

function matches(src: string): boolean {
  return audio.src === src || audio.src.endsWith(src);
}

export const audioManager = {
  /** Play a URL from the start (or resume if it is already the current one). */
  play(src: string) {
    if (!matches(src)) audio.src = src;
    audio.play().catch((err) => {
      console.warn("[audioManager] play() rejected for", src, err?.message);
      notify();
    });
    // Attempt the graph AFTER starting playback, never before — and only if the
    // context is already running, so this can never mute the message.
    tryBuildGraph();
  },

  pause() {
    audio.pause();
  },

  toggle(src: string) {
    if (audioManager.isPlayingSrc(src)) audio.pause();
    else audioManager.play(src);
  },

  seek(time: number) {
    audio.currentTime = time;
  },

  setSpeed(rate: number) {
    audio.playbackRate = rate;
  },

  /**
   * True only if audio is genuinely playing. A wedged element reports
   * `paused === false` forever; "no progress for STALL_MS" counts as not
   * playing, so one bad file can never block every later message.
   */
  isPlaying(): boolean {
    if (audio.paused || audio.ended) return false;
    if (lastProgressAt && Date.now() - lastProgressAt > STALL_MS) {
      console.warn(
        "[audioManager] releasing wedged playback after",
        Math.round((Date.now() - lastProgressAt) / 1000) + "s:",
        audio.src,
      );
      try {
        audio.pause();
      } catch {
        /* nothing useful to do */
      }
      lastProgressAt = 0;
      return false;
    }
    return true;
  },

  isPlayingSrc(src: string): boolean {
    return audioManager.isPlaying() && matches(src);
  },

  /** Did this URL ever actually produce sound in this session? */
  hasStarted(src: string): boolean {
    return startedSrcs.has(src) || [...startedSrcs].some((s) => s.endsWith(src));
  },

  getCurrentSrc(): string {
    return audio.src;
  },

  getCurrentTime(): number {
    return audio.currentTime;
  },

  getDuration(): number {
    return audio.duration || 0;
  },

  /**
   * Normalised 0..1 loudness, smoothed, for the 3D Pal's mouth/body motion.
   * Returns a decaying value when nothing is playing. If the analyser graph
   * could not be built safely, falls back to a gentle synthetic pulse while
   * audio plays so the Pal still animates rather than sitting frozen.
   */
  getAmplitude(): number {
    if (!audioManager.isPlaying()) {
      smoothedAmp *= 0.8;
      return smoothedAmp;
    }
    tryBuildGraph();
    if (!analyser || !ampBuf) {
      // No analyser (context never resumed). Keep the Pal alive with a soft
      // oscillation driven by playback position — never a frozen face.
      const t = audio.currentTime;
      const target = 0.35 + 0.25 * Math.abs(Math.sin(t * 9));
      smoothedAmp += (target - smoothedAmp) * 0.3;
      return smoothedAmp;
    }
    analyser.getByteFrequencyData(ampBuf);
    let sum = 0;
    for (let i = 0; i < ampBuf.length; i++) sum += ampBuf[i];
    const avg = sum / ampBuf.length / 255;
    const target = Math.min(1, avg * 2.6);
    // Attack fast, release a touch slower — reads like speech.
    smoothedAmp += (target - smoothedAmp) * (target > smoothedAmp ? 0.6 : 0.25);
    return smoothedAmp;
  },

  /**
   * Mouth-shape hint for the mascot: { open, wide } in 0..1. `open` ≈ loudness,
   * `wide` ≈ spectral tilt toward high frequencies.
   */
  getMouth(): { open: number; wide: number } {
    const open = audioManager.getAmplitude();
    if (!audioManager.isPlaying() || !analyser || !ampBuf) {
      smoothedWide *= 0.85;
      return { open, wide: smoothedWide };
    }
    // ampBuf was just filled by getAmplitude(). Split low vs high energy.
    const n = ampBuf.length;
    const mid = Math.floor(n * 0.35);
    let lo = 0,
      hi = 0;
    for (let i = 0; i < n; i++) (i < mid ? (lo += ampBuf[i]) : (hi += ampBuf[i]));
    const total = lo + hi;
    const tilt = total > 0 ? hi / total : 0; // 0 = all low (round) → 1 = high (wide)
    const target = Math.min(1, Math.max(0, (tilt - 0.25) * 2.2));
    smoothedWide += (target - smoothedWide) * 0.3;
    return { open, wide: smoothedWide };
  },

  /** Subscribe to playback state changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
