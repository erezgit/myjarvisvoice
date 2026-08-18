import { useEffect, useRef, useState } from "react";

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

  return (
    // FULL BLEED, AND NO CHROME AT ALL. No padding, border, radius, card
    // background or header — the frame is the only thing here, touching the top
    // of the window. The CANVAS/title row that used to sit above it is gone at
    // Erez's request; the history arrows went with it, since that row was the
    // only place they lived.
    <div className="sticky top-0 z-10 pb-2 bg-background">
      <div className="overflow-hidden">
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
          /* 16:9, not a fixed 200px. Edge-to-edge only makes the FRAME full
             width — a 16:9 video inside a 2.2:1 box still fits by height and
             leaves black bars down both sides. Matching the box to the video's
             own ratio is what actually fills the window. Animated cards don't
             care; they fill whatever box they are given. */
          className="block w-full aspect-video border-0 bg-black"
        />
      </div>
    </div>
  );
}
