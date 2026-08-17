import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API = "http://localhost:3001";

type CanvasDoc = {
  id: number;
  html: string;
  title: string | null;
  agent: string | null;
  created_at: string;
};

/**
 * The pinned Canvas card — Jarvis's visual channel.
 *
 * Renders nothing until something has been pushed, so the app looks exactly as
 * it did before the first `canvas-push.sh`. Once there is a document it sticks
 * to the top of the feed and the agent cards scroll underneath it.
 */
export function CanvasCard() {
  const [docs, setDocs] = useState<CanvasDoc[]>([]);
  // Index into `docs` (0 = newest). A fresh push always snaps back to 0 — the
  // point of the card is to show what Jarvis just said.
  const [index, setIndex] = useState(0);
  const latestIdRef = useRef<number>(0);

  const fetchDocs = () => {
    fetch(`${API}/api/canvas`)
      .then((r) => r.json())
      .then((rows: CanvasDoc[]) => {
        setDocs(rows);
        if (rows.length && rows[0].id !== latestIdRef.current) {
          latestIdRef.current = rows[0].id;
          setIndex(0);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchDocs();
    const es = new EventSource(`${API}/api/events`);
    es.onmessage = (e) => {
      try {
        if (JSON.parse(e.data).resource === "canvas") fetchDocs();
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => es.close();
  }, []);

  if (!docs.length) return null;

  const doc = docs[Math.min(index, docs.length - 1)];
  const hasHistory = docs.length > 1;

  return (
    <div className="sticky top-0 z-10 px-4 pt-3 pb-2 bg-background">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header. Everything sits LEFT and the row keeps its right end clear:
            the autoplay toggle is pinned over that corner at a higher z-index. */}
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 pr-12">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Canvas
          </span>
          {doc.title && (
            <span className="text-[12px] text-foreground truncate">{doc.title}</span>
          )}
          {hasHistory && (
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              {/* Older is FORWARD in the array (index 0 is newest). */}
              <button
                onClick={() => setIndex((i) => Math.min(i + 1, docs.length - 1))}
                disabled={index >= docs.length - 1}
                title="Older"
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {docs.length - index}/{docs.length}
              </span>
              <button
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index <= 0}
                title="Newer"
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* THE SANDBOX.
            allow-scripts and NOTHING else. Adding allow-same-origin here would
            put the document in the app's own origin and hand it the app, the
            SQLite API on :3001, and everything those can reach — the two flags
            together are documented by the HTML spec as equivalent to removing
            the sandbox. It stays exactly as it is.

            `src`, NOT `srcDoc`: a srcdoc frame inherits the embedding page's
            CSP, and Tauri's has no 'unsafe-inline' for scripts — so in the real
            desktop app a srcdoc canvas rendered with no script and no styling
            at all, while looking perfect in a browser. Loading from a real URL
            means the frame carries the policy the SERVER sets on it.
            key={doc.id} remounts the frame per document so animations restart.
            pointer-events-none keeps v1 a display surface, not an input. */}
        <iframe
          key={doc.id}
          title={doc.title || "Canvas"}
          sandbox="allow-scripts"
          src={`${API}/api/canvas/${doc.id}/frame`}
          className="block w-full h-[200px] border-0 bg-transparent pointer-events-none"
        />
      </div>
    </div>
  );
}
