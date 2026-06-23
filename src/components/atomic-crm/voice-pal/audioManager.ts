/**
 * Module-level singleton Audio element.
 * Shared between SSE auto-play and all VoicePlayerInline instances.
 * Only one message plays at a time — swapping src stops the previous.
 */

// The single Audio element — lives outside React
const audio = new Audio();

// Listeners for reactive state updates
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

// ── Autoplay priming (Tauri / WebKit) ─────────────────────────────────────
// WebKit blocks programmatic audio.play() until the element has been started
// once inside a real user gesture. Crucially this grant is PER PAGE SESSION —
// it is NOT persisted, so the localStorage "audio-unlocked" flag alone does
// not re-enable autoplay after a relaunch. We must prime the element on the
// first gesture of EVERY load. After priming, SSE-driven new messages auto-play
// with no click. (The localStorage flag is kept only to skip the one-time
// "Start Voice" UI gate.)
// A real (but silent) source is required: calling play() on a srcless element
// rejects instantly and never grants activation. Playing this tiny silent clip
// UNMUTED inside the gesture establishes full unmuted-autoplay rights for the
// session — with no audible blip.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
let primed = false;
const prime = () => {
  if (primed) return;
  primed = true;
  audio.src = SILENT_WAV;
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
    localStorage.setItem("audio-unlocked", "true");
    document.removeEventListener("pointerdown", prime, true);
    document.removeEventListener("keydown", prime, true);
  }).catch(() => {
    // Not unlocked yet — let the next gesture retry.
    primed = false;
  });
};
// capture-phase so any click anywhere (incl. stopPropagation handlers) primes it
document.addEventListener("pointerdown", prime, true);
document.addEventListener("keydown", prime, true);

export const audioManager = {
  /** Play a URL. If same URL, resume; if different, start from beginning. */
  play(src: string) {
    const fullSrc = audio.src;
    const isSame = fullSrc.endsWith(src) || fullSrc === src;
    if (isSame) {
      audio.play().catch(() => {});
    } else {
      audio.src = src;
      audio.play().catch(() => {});
    }
  },

  pause() {
    audio.pause();
  },

  toggle(src: string) {
    if (audioManager.isPlayingSrc(src)) {
      audio.pause();
    } else {
      audioManager.play(src);
    }
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

  isPlayingSrc(src: string): boolean {
    return !audio.paused && (audio.src.endsWith(src) || audio.src === src);
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

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
