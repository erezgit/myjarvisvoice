import { useState, useRef, useEffect, memo } from 'react';
import { Play, Pause } from 'lucide-react';
import { Slider } from '@/components/desktop/ui/slider';
import { voicePlayedTracker } from '@/lib/voice-played-tracker';

interface VoicePlayerProps {
  audioUrl?: string;
  status?: 'generating' | 'ready' | 'error';
  autoPlay?: boolean;
  className?: string;
}

const VoicePlayer = memo(function VoicePlayer({
  audioUrl,
  status = 'ready',
  autoPlay = false,
  className = ""
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play when audioUrl becomes available and audio element is mounted
  useEffect(() => {
    if (!autoPlay || !audioUrl || voicePlayedTracker.hasPlayed(audioUrl)) {
      return;
    }

    // Check if another audio is currently playing - skip auto-play if so
    if (voicePlayedTracker.isAnyPlaying()) {
      return;
    }

    // Mark as played BEFORE attempting play — prevents re-trigger on unmount/remount
    // (unmount fires pause event → markAsPaused removes from tracking → remount would replay)
    voicePlayedTracker.markAsPlayed(audioUrl);

    // Wait for next tick to ensure audio element is mounted
    const timeoutId = setTimeout(() => {
      if (!audioRef.current) {
        return;
      }

      // Double-check nothing started playing while we waited
      if (voicePlayedTracker.isAnyPlaying()) {
        return;
      }

      const audio = audioRef.current;

      const handleCanPlay = () => {
        audio.play()
          .catch(() => {
            setIsPlaying(false);
          });
      };

      // Check if audio is already ready
      if (audio.readyState >= 3) {
        handleCanPlay();
      } else {
        audio.addEventListener('canplay', handleCanPlay, { once: true });
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoPlay, audioUrl]);

  // Update duration when metadata loads
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Use requestAnimationFrame for smooth 60 FPS progress updates
  useEffect(() => {
    let animationFrameId: number;

    const updateProgress = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  // Handle slider change (seeking)
  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        disabled={!audioUrl}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        ) : (
          <Play className="w-4 h-4 text-gray-700 dark:text-gray-300 ml-0.5" />
        )}
      </button>

      {/* Progress slider and time display */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-1"
          disabled={!audioUrl}
        />

        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Audio element - only rendered when audioUrl exists */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            voicePlayedTracker.markAsPlayed(audioUrl);
          }}
          onPlay={() => {
            setIsPlaying(true);
            voicePlayedTracker.markAsPlaying(audioUrl);
          }}
          onPause={() => {
            setIsPlaying(false);
            // Don't call markAsPaused here — unmount fires pause event,
            // which would erase tracking and cause replay on remount
          }}
          onLoadedMetadata={handleLoadedMetadata}
          preload="auto"
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
});

export { VoicePlayer };
