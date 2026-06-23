/**
 * Module-level singleton Audio element.
 * Shared between SSE auto-play and all VoicePlayerInline instances.
 * Only one message plays at a time — swapping src stops the previous.
 */

// The single Audio element — lives outside React
const audio = new Audio();

// Unlock flag — Tauri/WebKit requires one user-gesture play before auto-play works
let unlocked = localStorage.getItem("audio-unlocked") === "true";

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

// Unlock on first user click (Tauri WebKit autoplay policy)
if (!unlocked) {
  const unlock = () => {
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      unlocked = true;
      localStorage.setItem("audio-unlocked", "true");
    }).catch(() => {});
    document.removeEventListener("click", unlock);
  };
  document.addEventListener("click", unlock, { once: false });
}

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
