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

// ── No Web Audio graph — ever (6 Oct 2026) ──────────────────────────────────
// There used to be an analyser here, built on first play with
// createMediaElementSource(), so the 3D Pal's mouth could follow the voice.
// That routing is IRREVERSIBLE: from then on every message had to go through
// an AudioContext that macOS suspends whenever the window is idle or
// unfocused, and the "wake it before playing" fix (await ctx.resume()) can
// wait forever without a user gesture — so play() was never even called.
// Erez's symptom, again on 6 Oct: the first message plays, the next ones are
// silent until the app is refreshed (a refresh is a fresh element, no graph).
// The avatar was removed in August and nothing reads the analyser any more, so
// the graph goes: the element stays wired straight to the speakers for good.
let smoothedAmp = 0;
let smoothedWide = 0;

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
    // No analyser (see the note at the top): a soft oscillation driven by
    // playback position, so anything that animates to the voice still moves.
    const t = audio.currentTime;
    const target = 0.35 + 0.25 * Math.abs(Math.sin(t * 9));
    smoothedAmp += (target - smoothedAmp) * 0.3;
    return smoothedAmp;
  },

  /**
   * Mouth-shape hint for the mascot: { open, wide } in 0..1. `open` ≈ loudness,
   * `wide` ≈ spectral tilt toward high frequencies.
   */
  getMouth(): { open: number; wide: number } {
    const open = audioManager.getAmplitude();
    smoothedWide *= 0.85;
    return { open, wide: smoothedWide };
  },

  /** Subscribe to playback state changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
