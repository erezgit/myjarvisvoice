import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { useRecorder } from "./recorderStore";
import { RecordButton } from "./RecordButton";

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
  const [more, setMore] = useState(false);       // another page exists
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE = 20;

  const fetchPage = async (before?: number): Promise<Recording[]> => {
    const r = await fetch(`http://localhost:3001/api/record/list?limit=${PAGE}${before ? `&before=${before}` : ""}`);
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  };

  // The first page refreshes while the page is open, so a recording that is still
  // transcribing shows its count growing. Pages already loaded below it stay as they are.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchPage()
        .then((first) => {
          if (cancelled) return;
          setError(null);
          setList((prev) => {
            const older = (prev ?? []).filter((p) => Number(p.id) < Math.min(...first.map((f) => Number(f.id))));
            return [...first, ...older];
          });
          setMore((m) => m || first.length === PAGE);
        })
        .catch((e) => !cancelled && setError(e?.message || "could not load recordings"));
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [rec.recording]);

  const loadMore = async () => {
    if (!list?.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(Number(list[list.length - 1].id));
      setList([...list, ...page]);
      setMore(page.length === PAGE);
    } catch (e: any) {
      setError(e?.message || "could not load more");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">Recordings</div>
          <div className="text-[11px] text-muted-foreground">
            {list ? `${list.length}${more ? "+" : ""} recording${list.length === 1 ? "" : "s"}` : "Loading…"}
          </div>
        </div>
        <RecordButton />
      </div>
      {rec.error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{rec.error}</div>
      )}

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
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${live ? "animate-pulse bg-green-500" : "bg-muted-foreground/30"}`}
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
        {more && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
        {list && list.length === 0 && (
          <div className="py-24 text-center">
            <div className="mb-3 text-4xl">🎙️</div>
            <p className="text-sm text-muted-foreground">No recordings yet — press Record above</p>
          </div>
        )}
      </div>
    </div>
  );
}

RecordingsPage.path = "/voice-pal/recordings";
