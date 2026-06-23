import { useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Slider } from "@/components/desktop/ui/slider";
import { audioManager } from "./audioManager";

interface VoicePlayerInlineProps {
  audioUrl: string;
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

// Track which URLs have been auto-played to prevent replay on re-render
const autoPlayedUrls = new Set<string>();

export function VoicePlayerInline({ audioUrl, autoPlay }: VoicePlayerInlineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNew, setIsNew] = useState(() => !getPlayedSet().has(audioUrl));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  // Determine if we should auto-play this instance
  const shouldAutoPlay = autoPlay && !autoPlayedUrls.has(audioUrl);

  // Mark as played immediately to prevent re-triggers
  if (shouldAutoPlay) {
    autoPlayedUrls.add(audioUrl);
  }

  // Auto-play via the shared audioManager (unlocked by user's first click)
  useEffect(() => {
    if (!shouldAutoPlay) return;
    audioManager.play(audioUrl);
    markPlayed(audioUrl);
    setIsNew(false);
  }, [shouldAutoPlay, audioUrl]);

  // Subscribe to audioManager state changes for this URL
  useEffect(() => {
    const unsub = audioManager.subscribe(() => {
      const playing = audioManager.isPlayingSrc(audioUrl);
      setIsPlaying(playing);
      if (playing) {
        setCurrentTime(audioManager.getCurrentTime());
        setDuration(audioManager.getDuration());
      }
    });
    return unsub;
  }, [audioUrl]);

  // rAF progress tracking when this URL is playing
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

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.toggle(audioUrl);
    if (isNew) {
      markPlayed(audioUrl);
      setIsNew(false);
    }
  }, [audioUrl, isNew]);

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
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-500 min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-1"
        />

        <span className="text-xs text-gray-500 min-w-[40px]">
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
