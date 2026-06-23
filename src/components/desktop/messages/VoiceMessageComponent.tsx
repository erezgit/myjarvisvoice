import { useState, useRef, useEffect, memo } from 'react';
import { Play, Pause } from 'lucide-react';
import type { VoiceMessage } from '@/components/atomic-crm/chat/types';
import { resolveAudioUrl } from '@/components/atomic-crm/chat/utils/constants';
import { useMemberConfig } from '@/components/atomic-crm/contexts/MemberConfigContext';
import { Slider } from '@/components/desktop/ui/slider';
import { voicePlayedTracker } from '@/lib/voice-played-tracker';

interface VoiceMessageComponentProps {
  message: VoiceMessage;
}

export const VoiceMessageComponent = memo(function VoiceMessageComponent({ message }: VoiceMessageComponentProps) {
  const { chatUrl } = useMemberConfig();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const resolvedAudioUrl = resolveAudioUrl(message.audioUrl, chatUrl);

  // Auto-play when message arrives
  useEffect(() => {
    if (!message.autoPlay || !audioRef.current || !resolvedAudioUrl || voicePlayedTracker.hasBeenPlayed(resolvedAudioUrl)) {
      return;
    }

    // Check if another audio is currently playing - skip auto-play if so
    if (voicePlayedTracker.isAnyPlaying()) {
      return;
    }

    // Mark as played BEFORE attempting play — prevents replay on unmount/remount
    voicePlayedTracker.markAsPlayed(resolvedAudioUrl);

    // Small delay to ensure audio element is ready
    const timer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch((error) => {
          console.warn('[VoiceMessage] Auto-play failed:', error);
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [message.autoPlay, resolvedAudioUrl]);

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
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
    <div className="mb-3 pr-3 pl-0 pt-3 pb-3">
      {/* Plain text message */}
      <div className="text-gray-900 dark:text-gray-100 text-sm mb-3">
        {message.content}
      </div>

      {/* Audio controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
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
          />

          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={resolvedAudioUrl}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />
    </div>
  );
});