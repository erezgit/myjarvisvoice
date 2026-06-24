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
