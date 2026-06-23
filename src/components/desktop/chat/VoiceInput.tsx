import { useEffect, forwardRef, useImperativeHandle } from "react";
import { Mic } from "lucide-react";
import { useVoiceRecorder, type RecorderState } from "@/components/atomic-crm/chat/hooks/useVoiceRecorder";

// Expose toggle function via ref
export interface VoiceInputHandle {
  toggleRecording: () => void;
}

// Waveform component - responds to actual audio level
function Waveform({ audioLevel }: { audioLevel: number }) {
  // Generate bar heights based on audio level
  // Center bar is tallest, edges are shorter
  const getBarHeight = (index: number): number => {
    const baseMultiplier = index === 2 ? 1.0 : index === 1 || index === 3 ? 0.8 : 0.6;
    // Minimum height when silent, scales up with audio level
    const minHeight = 0.2;
    const maxHeight = 1.0;
    const height = minHeight + (audioLevel * baseMultiplier * (maxHeight - minHeight));
    return Math.min(maxHeight, height);
  };

  return (
    <div className="flex items-center justify-center gap-[1.5px] h-3.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[2px] bg-slate-100 rounded-full transition-all duration-75"
          style={{ height: `${getBarHeight(i) * 100}%` }}
        />
      ))}
    </div>
  );
}

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(
  function VoiceInput({
    onTranscription,
    onError,
    disabled = false,
    className = ""
  }, ref) {
  const {
    state,
    error,
    audioLevel,
    toggleRecording,
  } = useVoiceRecorder({
    onTranscription,
    onError,
  });

  // Expose toggleRecording to parent via ref
  useImperativeHandle(ref, () => ({
    toggleRecording,
  }), [toggleRecording]);

  // Report errors to parent
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const isDisabled = disabled || state === "processing";

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={isDisabled}
      title={
        state === "idle" ? "Start recording (Ctrl+M)" :
        state === "recording" ? "Stop recording (Ctrl+M)" :
        "Processing..."
      }
      className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
        state === "recording"
          ? "bg-slate-700 text-slate-100"
          : "bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300"
      } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {/* Icon based on state */}
      {state === "processing" ? (
        // Simple circular spinner - matches file upload style
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : state === "recording" ? (
        <Waveform audioLevel={audioLevel} />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
});

export default VoiceInput;
