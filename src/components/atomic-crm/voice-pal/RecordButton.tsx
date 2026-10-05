import { useNavigate } from "react-router";
import { Circle, Square } from "lucide-react";
import { useRecorder, startRecording, stopRecording } from "./recorderStore";

/**
 * Record / Stop, at the top of the Recordings page (Erez, 6 Oct: "the record
 * button needs to be in the page of recording at the top"). Record starts a new
 * recording and opens its transcript; while one runs, the same button stops it.
 */
export function RecordButton() {
  const rec = useRecorder();
  const navigate = useNavigate();
  const onClick = async () => {
    if (rec.busy) return;
    if (rec.recording) { await stopRecording(); return; }
    const id = await startRecording();
    if (id) navigate(`/voice-pal/recordings/${id}`);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={rec.busy}
      title={rec.recording ? "Stop recording" : "Record the meeting and show its transcript"}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
        rec.recording
          ? "border-red-500/40 bg-red-500/15 text-red-500"
          : "border-red-500/30 text-foreground hover:bg-red-500/10"
      }`}
    >
      {rec.recording ? (
        <><Square className="h-3.5 w-3.5 fill-current" />Stop</>
      ) : (
        <><Circle className="h-3.5 w-3.5 fill-current text-red-500" />{rec.busy ? "Starting…" : "Record"}</>
      )}
    </button>
  );
}
