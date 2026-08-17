import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
// The library is INLINED into the frame, never fetched. The frame is sandboxed
// without allow-same-origin and carries a CSP of `default-src 'none'`, so it has
// no network at all — a CDN tag would simply never load. Bundling is not an
// optimisation here, it is the only thing that works.
//
// It is VENDORED rather than deep-imported from node_modules: animejs v4 ships
// an `exports` map that does not expose dist/bundles/*, so `animejs/dist/...`
// fails to resolve. Refresh it with:
//   cp node_modules/animejs/dist/bundles/anime.umd.min.js \
//      src/components/atomic-crm/voice-pal/vendor/
// Currently anime.js v4.5.0 (MIT). The UMD build attaches to `window.anime`.
import animeUmd from "./vendor/anime.umd.min.js?raw";

const API = "http://localhost:3001";

type CanvasDoc = {
  id: number;
  html: string;
  title: string | null;
  agent: string | null;
  created_at: string;
};

/**
 * Compose the document that actually runs in the frame.
 *
 * Three things are wrapped around the author's HTML:
 *
 *  1. A CSP of `default-src 'none'`. The sandbox attribute already denies the
 *     document an origin, which kills fetch/XHR and any reach into the app —
 *     but it does NOT stop a plain `<img src="https://…">` beacon. The spec's
 *     requirement is that the card "cannot call home", and only the CSP closes
 *     that last door. Inline script and style are allowed because everything
 *     here is inline by construction.
 *  2. anime.js, inlined, with its members lifted onto `window` so a document can
 *     write `animate(...)` directly.
 *  3. Sane defaults — transparent background, no margin, a readable font — so a
 *     bare `<div>Hello</div>` looks intentional on a dark card.
 */
function buildFrameDoc(html: string): string {
  // A `</script>` anywhere in an inlined script closes the tag early and dumps
  // the remainder as text. Vanishingly unlikely in minified JS, but this is a
  // one-line guarantee rather than an assumption.
  const safeLib = animeUmd.replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:;">
<style>
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: transparent; overflow: hidden;
    font-family: ui-sans-serif, -apple-system, "SF Pro Text", system-ui, sans-serif;
    color: #e7e5e4;
  }
  * { box-sizing: border-box; }
</style>
<script>${safeLib}</script>
<script>
  // Lift anime's exports to globals so a document can call animate(), stagger(),
  // createTimeline(), svg.*, utils.* without knowing the namespace.
  (function () {
    var a = window.anime;
    if (!a) return;
    for (var k in a) { if (!(k in window)) { window[k] = a[k]; } }
  })();
</script>
</head>
<body>
${html}
</body>
</html>`;
}

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
            key={doc.id} remounts the frame per document so animations restart.
            pointer-events-none keeps v1 a display surface, not an input. */}
        <iframe
          key={doc.id}
          title={doc.title || "Canvas"}
          sandbox="allow-scripts"
          srcDoc={buildFrameDoc(doc.html)}
          className="block w-full h-[200px] border-0 bg-transparent pointer-events-none"
        />
      </div>
    </div>
  );
}
