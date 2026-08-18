import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API = "http://localhost:3001";
// The frame comes from its OWN bare origin, not the API. See the long note in
// server/index.ts: the outer frame must carry allow-same-origin for a YouTube
// player to run at all, and "same origin" must therefore mean an origin that
// holds nothing rather than the whole SQLite REST surface.
const FRAME_ORIGIN = "http://127.0.0.1:3007";

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
        {/* Header. The right end used to be kept clear for the autoplay switch
            that floated over this corner; that control is a button in the bottom
            bar now, so the row gets its full width back. */}
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
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
            allow-scripts + allow-same-origin, and nothing else — no allow-forms,
            no allow-popups, no allow-top-navigation.

            That pairing is only safe because of WHERE this frame is served from.
            The two flags together let a document reach its own origin and, if
            that origin is also its parent's, strip its own sandbox. Here the
            origin is 127.0.0.1:3007, which serves one GET and owns no data, and
            the parent is the Tauri app on a different origin entirely. Point
            this back at :3001 and it would hand the card the whole SQLite API.

            `src`, NOT `srcDoc`: a srcdoc frame inherits the embedding page's
            CSP, and Tauri's has no 'unsafe-inline' for scripts — so in the real
            desktop app a srcdoc canvas rendered with no script and no styling
            at all, while looking perfect in a browser. Loading from a real URL
            means the frame carries the policy the SERVER sets on it.

            allow-same-origin is present ONLY because a youtube-nocookie player
            cannot run without it — the sandbox forces an opaque origin on every
            nested frame too. It is safe here and would not be on :3001, because
            this origin serves one GET and owns no data. Do not repoint this at
            the API port.
            key={doc.id} remounts the frame per document so animations restart.

            Pointer events are ON. v1 deliberately had them off — a display
            surface, not an input — but a video cannot be started without a
            click, so "the card can play a YouTube embed" and "the card ignores
            the mouse" cannot both be true. Every other card is non-interactive
            by construction anyway: they listen for nothing. */}
        <iframe
          key={doc.id}
          title={doc.title || "Canvas"}
          sandbox="allow-scripts allow-same-origin"
          /* Permissions Policy. Chrome's default allowlist for autoplay is
             'self', so a CROSS-ORIGIN child gets it only if the parent hands it
             over explicitly — without this attribute a nested YouTube player
             can never start on its own, no matter what the URL says. The
             WebView itself already permits gestureless playback (wry sets
             autoplay: true by default), so this attribute is the last gate. */
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          src={`${FRAME_ORIGIN}/frame/${doc.id}`}
          className="block w-full h-[200px] border-0 bg-transparent"
        />
      </div>
    </div>
  );
}
