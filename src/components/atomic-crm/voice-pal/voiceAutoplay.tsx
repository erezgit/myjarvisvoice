// ─────────────────────────────────────────────────────────────────────────────
// AUTOPLAY THAT DOES NOT DEPEND ON WHICH SCREEN IS OPEN.
//
// The bug, at the root: the thing that LISTENS for a new voice message and the
// thing that MAKES THE SOUND both lived inside VoicePalPage, which is a route:
//
//     <Route path={VoicePalPage.path} element={<VoicePalPage />} />
//
// Navigate anywhere else and the component unmounts, the EventSource closes, and
// nothing can auto-play. It has been that way since the first commit — there has
// never been an app-level listener — so "it only speaks when I'm on that screen"
// was not a regression, it was the architecture. It merely looked fine while that
// screen happened to be the one left open.
//
// The second half is the sound itself. A webview <audio> element is subject to
// WKWebView's autoplay policy and to macOS App Nap throttling once the window is
// not frontmost. Meanwhile `play_audio` — a real rodio player — has existed in
// src-tauri/src/lib.rs since the beginning and was NEVER called from the UI.
//
// So: this service is mounted ONCE at the app root, outside the router, and plays
// through the native command. Native audio does not care which route is open,
// whether the window has focus, or whether macOS has napped the webview.
//
// It deliberately yields to VoicePalPage when that page is open, because there
// the inline player drives the progress bar and the Pal's amplitude — playing
// both would double the audio. One owner at a time, and the page wins while it
// is visible.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

const AUTOPLAY_KEY = "mc-autoplay-enabled";
const EVENTS_URL = "http://localhost:3001/api/events";  // API prefix set below
const API = "http://localhost:3001";
const MESSAGES_URL = `${API}/api/voice_messages`;

/** Set by VoicePalPage while it is mounted. While true this service stays quiet
 *  and lets the inline player own playback, so the visualiser still works and the
 *  sound is never doubled. */
let pageOwnsPlayback = false;
export function setPageOwnsPlayback(owns: boolean) {
  pageOwnsPlayback = owns;
}

async function playNatively(url: string) {
  try {
    await invoke("play_audio", { url });
  } catch (e) {
    // If the native path is unavailable we say so rather than failing silently —
    // silence is exactly how this class of bug hides.
    console.error("[voice] native playback failed:", e);
  }
}

export function VoiceAutoplayService() {
  const latestId = useRef<number>(0);
  const primed = useRef(false);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      if (!alive) return;
      try {
        const res = await fetch(MESSAGES_URL);
        const msgs = await res.json();
        if (!alive || !Array.isArray(msgs) || !msgs.length) return;
        const newest = msgs[0];

        // First pass only establishes the high-water mark — otherwise every app
        // start would replay whatever was last said.
        if (!primed.current) {
          primed.current = true;
          latestId.current = newest.id;
          return;
        }
        if (newest.id <= latestId.current) return;
        latestId.current = newest.id;

        if (localStorage.getItem(AUTOPLAY_KEY) === "false") return;
        if (pageOwnsPlayback) return;      // the open page will play it
        // The row carries a PATH, not a URL — the server serves it from the
        // same origin the page talks to.
        if (!newest.audio_path) return;
        void playNatively(`${API}${newest.audio_path}`);
      } catch {
        /* the local server is briefly down — the next event or poll retries */
      }
    };

    void check();

    // Push, for latency.
    const es = new EventSource(EVENTS_URL);
    es.onmessage = () => void check();
    es.onerror = () => { /* EventSource reconnects on its own */ };

    // Pull, as the safety net. macOS throttles background timers rather than
    // stopping them, and SSE can sit half-open after a network change — a slow
    // poll means a message is late at worst, never lost.
    const poll = window.setInterval(check, 15_000);

    return () => {
      alive = false;
      es.close();
      clearInterval(poll);
    };
  }, []);

  return null;
}
