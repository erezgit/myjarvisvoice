/**
 * Module-level singleton <audio> — the SINGLE SOURCE OF TRUTH for playback.
 * Shared by the auto-play of new messages and every VoicePlayerInline instance,
 * so the sound and the progress bar are always the same playback. Only one
 * message plays at a time; swapping `src` stops the previous one.
 *
 * Autoplay needs no user gesture: the Tauri/wry WebView sets
 * mediaTypesRequiringUserActionForPlayback = None (wry's default), so the player
 * can start audio on its own when a message arrives.
 */
const audio = new Audio();
// Allow a Web Audio analyser to read the (cross-origin :3001) stream — the voice
// server sends Access-Control-Allow-Origin: *, so with crossOrigin set the audio
// is not tainted and getByteFrequencyData returns a real signal.
audio.crossOrigin = "anonymous";

// ── Live amplitude, for the 3D Pal's mouth/body motion ──────────────────────
// Lazily build one audio graph: element → analyser → destination. Created on the
// first getAmplitude() call (after playback has begun, so the context resumes).
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let ampBuf: Uint8Array | null = null;
let graphReady = false;
let smoothedAmp = 0;
let smoothedWide = 0;

function ensureGraph() {
  if (graphReady) return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctx();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    ampBuf = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    graphReady = true;
  } catch {
    // MediaElementSource can only be made once / may fail pre-gesture; keep going.
    graphReady = true;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((fn) => fn());
}

audio.addEventListener("play", notify);
audio.addEventListener("pause", notify);
audio.addEventListener("ended", notify);
audio.addEventListener("timeupdate", notify);
audio.addEventListener("loadedmetadata", notify);

function matches(src: string): boolean {
  return audio.src === src || audio.src.endsWith(src);
}

export const audioManager = {
  /** Play a URL from the start (or resume if it's already the current one). */
  play(src: string) {
    ensureGraph();
    if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
    if (!matches(src)) audio.src = src;
    audio.play().catch(() => {});
  },

  pause() {
    audio.pause();
  },

  /** Toggle play/pause for a URL. */
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

  isPlaying(): boolean {
    return !audio.paused;
  },

  /**
   * Normalized 0..1 loudness of the currently-playing audio, smoothed for a
   * natural mouth/body motion. Returns 0 when nothing is playing. Drives the
   * 3D Pal. Safe to call every frame.
   */
  getAmplitude(): number {
    if (audio.paused) {
      smoothedAmp *= 0.8;
      return smoothedAmp;
    }
    ensureGraph();
    if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
    if (!analyser || !ampBuf) return smoothedAmp;
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
   * Mouth-shape hint for the cartoon mascot: { open, wide } in 0..1.
   * `open` ≈ loudness (jaw drop); `wide` ≈ spectral tilt toward high freqs
   * (an "eee"/consonant spread vs a round "oh"). Cheap heuristic off the same
   * analyser — good enough to make a flat mouth read as talking.
   */
  getMouth(): { open: number; wide: number } {
    const open = this.getAmplitude();
    if (audio.paused || !analyser || !ampBuf) {
      smoothedWide *= 0.85;
      return { open, wide: smoothedWide };
    }
    // ampBuf was just filled by getAmplitude(). Split low vs high energy.
    const n = ampBuf.length;
    const mid = Math.floor(n * 0.35);
    let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) (i < mid ? (lo += ampBuf[i]) : (hi += ampBuf[i]));
    const total = lo + hi;
    const tilt = total > 0 ? hi / total : 0; // 0 = all low (round), →1 = high (wide)
    const target = Math.min(1, Math.max(0, (tilt - 0.25) * 2.2));
    smoothedWide += (target - smoothedWide) * 0.3;
    return { open, wide: smoothedWide };
  },

  isPlayingSrc(src: string): boolean {
    return !audio.paused && matches(src);
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

  /** Subscribe to playback state changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
