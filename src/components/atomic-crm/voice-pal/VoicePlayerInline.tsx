import { useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Slider } from "@/components/desktop/ui/slider";
import { audioManager } from "./audioManager";

interface VoicePlayerInlineProps {
  audioUrl: string;
  /** When true, this message auto-plays once (the newest arrival). */
  autoPlay?: boolean;
}

const PLAYED_KEY = "mc-voice-played";

function getPlayedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PLAYED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markPlayed(url: string) {
  const s = getPlayedSet();
  s.add(url);
  const arr = [...s];
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  localStorage.setItem(PLAYED_KEY, JSON.stringify(arr));
}

const SPEEDS = [1, 1.25, 1.5];

// URLs already auto-played this session — prevents a re-render from replaying.
const autoPlayedUrls = new Set<string>();

export function VoicePlayerInline({ audioUrl, autoPlay }: VoicePlayerInlineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNew, setIsNew] = useState(() => !getPlayedSet().has(audioUrl));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  // Auto-play the newest message through the shared player. This single playback
  // produces the sound AND drives the progress bar below — one source of truth.
  //
  // Note it does NOT mark the message played here. "Played" must mean sound
  // actually happened, not that we asked for it — otherwise a silent failure
  // still burns the green "new" badge and the message looks heard when it
  // wasn't. The subscriber below promotes it once playback genuinely starts.
  useEffect(() => {
    if (!autoPlay || autoPlayedUrls.has(audioUrl)) return;
    // Don't interrupt a message that's already playing. If something is playing,
    // leave this one waiting with its green play button — Erez clicks it when
    // he's ready. Only auto-play when the player is idle. (Erez, 2026-07-08.)
    if (audioManager.isPlaying()) return;
    autoPlayedUrls.add(audioUrl);
    audioManager.play(audioUrl);
  }, [autoPlay, audioUrl]);

  // Reflect the shared player's state for this URL, and retire the "new" badge
  // only once this URL has actually produced sound.
  useEffect(() => {
    const sync = () => {
      setIsPlaying(audioManager.isPlayingSrc(audioUrl));
      if (audioManager.getCurrentSrc().endsWith(audioUrl)) {
        setCurrentTime(audioManager.getCurrentTime());
        setDuration(audioManager.getDuration());
      }
      if (audioManager.hasStarted(audioUrl)) {
        setIsNew((wasNew) => {
          if (wasNew) markPlayed(audioUrl);
          return false;
        });
      }
    };
    const unsub = audioManager.subscribe(sync);
    sync();
    return unsub;
  }, [audioUrl]);

  // Smooth progress while this URL is playing.
  useEffect(() => {
    let raf: number;
    const update = () => {
      if (audioManager.isPlayingSrc(audioUrl)) {
        setCurrentTime(audioManager.getCurrentTime());
        setDuration(audioManager.getDuration());
        raf = requestAnimationFrame(update);
      }
    };
    if (isPlaying) raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, audioUrl]);

  // A click is a user gesture, which is also what lets the analyser context
  // resume. The badge is retired by the subscriber above once sound starts,
  // not here — so a click on a broken file leaves it green rather than
  // pretending it was heard.
  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.toggle(audioUrl);
  }, [audioUrl]);

  const cycleSpeed = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    audioManager.setSpeed(SPEEDS[next]);
  }, [speedIndex]);

  const handleSliderChange = useCallback((value: number[]) => {
    audioManager.seek(value[0]);
    setCurrentTime(value[0]);
  }, []);

  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={togglePlay}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0 ${
          isPlaying
            ? "bg-green-600 text-white"
            : isNew
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-muted hover:bg-muted/70 text-foreground"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-1"
        />

        <span className="text-xs text-muted-foreground min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      <button
        onClick={cycleSpeed}
        className={`text-[10px] font-normal w-9 text-center py-0.5 rounded-full shrink-0 transition-opacity ${
          isPlaying
            ? "text-white bg-[#999] hover:bg-[#888] opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {SPEEDS[speedIndex]}x
      </button>
    </div>
  );
}
