import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { useRecorder } from "./recorderStore";

/**
 * Every recording made on this Mac, newest first. Each Record → Stop is one
 * row (a `meetings` row in Neon); clicking it opens its transcript.
 */
type Recording = {
  id: number;
  title: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  lines: number;
};

// Neon returns "2026-10-05 18:44:58.503+00" — make it something Date parses everywhere.
function parse(ts: string | null) {
  return ts ? new Date(ts.replace(" ", "T").replace(/\+00$/, "Z")) : null;
}

function when(ts: string) {
  const d = parse(ts)!;
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function length(r: Recording) {
  const a = parse(r.started_at), b = parse(r.ended_at) ?? new Date();
  if (!a) return "";
  const min = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
  return min < 1 ? "under a minute" : `${min} min`;
}

export function RecordingsPage() {
  const navigate = useNavigate();
  const rec = useRecorder();
  const [list, setList] = useState<Recording[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("http://localhost:3001/api/record/list")
        .then(async (r) => {
          const body = await r.json();
          if (cancelled) return;
          if (!r.ok) { setError(body.error || `HTTP ${r.status}`); return; }
          setError(null);
          setList(body);
        })
        .catch((e) => !cancelled && setError(e?.message || "could not load recordings"));
    load();
    // Refresh while open, so a recording that is still transcribing shows its count growing.
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [rec.recording]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="text-sm font-medium text-foreground">Recordings</div>
        <div className="text-[11px] text-muted-foreground">
          {list ? `${list.length} recording${list.length === 1 ? "" : "s"}` : "Loading…"}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>
      )}

      <div className="flex-1 space-y-2 px-4 py-3">
        {list?.map((r) => {
          const live = rec.recording && rec.meeting_id === Number(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/voice-pal/recordings/${r.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-muted-foreground/30"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${live ? "animate-pulse bg-red-500" : "bg-muted-foreground/30"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{when(r.started_at)}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {live ? "Recording now" : length(r)} · {r.lines} line{r.lines === 1 ? "" : "s"}
                  {r.title && !r.title.startsWith("Recorded ") ? ` · ${r.title}` : ""}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
        {list && list.length === 0 && (
          <div className="py-24 text-center">
            <div className="mb-3 text-4xl">🎙️</div>
            <p className="text-sm text-muted-foreground">No recordings yet — press Record</p>
          </div>
        )}
      </div>
    </div>
  );
}

RecordingsPage.path = "/voice-pal/recordings";
