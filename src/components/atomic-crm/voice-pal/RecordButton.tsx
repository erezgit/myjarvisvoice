import { useNavigate } from "react-router";
import { Square } from "lucide-react";
import { useRecorder, startRecording, stopRecording } from "./recorderStore";

/**
 * Start / Stop, at the top of the Recordings page. Erez, 6 Oct: start is just a
 * green dot; while recording it stays green and pulses; Stop is quiet — white
 * with only a red border. Red is never the whole button.
 */
export function RecordButton({ showStop = true }: { showStop?: boolean }) {
  const rec = useRecorder();
  const navigate = useNavigate();

  // One green dot, a little bigger than the status dots. Idle: still. Recording: it
  // pulses (a ping ring behind it). No words on it (Erez, 6 Oct: "just a green button").
  const dot = (
    <span className="relative flex h-5 w-5 items-center justify-center">
      {rec.recording && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />}
      <span className="relative inline-flex h-5 w-5 rounded-full bg-green-500" />
    </span>
  );

  if (rec.recording) {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center" title="Recording">{dot}</span>
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
      title="Start recording"
      aria-label="Start recording"
      onClick={async () => {
        if (rec.busy) return;
        const id = await startRecording();
        if (id) navigate(`/voice-pal/recordings/${id}`);
      }}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 ${rec.busy ? "animate-pulse" : ""}`}
    >
      {dot}
    </button>
  );
}
