import { useNavigate } from "react-router";
import { Square } from "lucide-react";
import { useRecorder, startRecording, stopRecording } from "./recorderStore";

/**
 * Start recording / Stop, at the top of the Recordings page.
 *
 * Erez, 6 Oct: green to start ("our normal green"), green while recording, and
 * Stop quiet — white with only a red border. Red is never the whole button.
 */
export function RecordButton({ showStop = true }: { showStop?: boolean }) {
  const rec = useRecorder();
  const navigate = useNavigate();

  if (rec.recording) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex h-9 items-center gap-2 rounded-lg bg-green-600 px-3 text-xs font-medium text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Recording
        </span>
        {showStop && (
          <button
            type="button"
            onClick={() => !rec.busy && void stopRecording()}
            disabled={rec.busy}
            title="Stop recording"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-red-500 bg-white px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={rec.busy}
      title="Record the meeting and show its transcript"
      onClick={async () => {
        if (rec.busy) return;
        const id = await startRecording();
        if (id) navigate(`/voice-pal/recordings/${id}`);
      }}
      className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-green-600 px-3.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
    >
      <span className="h-2 w-2 rounded-full bg-white" />
      {rec.busy ? "Starting…" : "Start recording"}
    </button>
  );
}
