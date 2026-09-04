/**
 * serverEvents — ONE EventSource for the whole app.
 *
 * WHY THIS EXISTS, measured 2026-09-04.
 *
 * A browser will hold at most SIX simultaneous HTTP/1.1 connections to one
 * origin. `http://localhost:3001` is one origin, so those six are shared by
 * every API call, every image, and every voice .wav the page ever fetches.
 *
 * An EventSource never closes — that is the point of it; the server holds the
 * socket open so it can push. Six components each opened their OWN
 * (VoicePalPage, MissionControlPage, LikesPage, CanvasCard, voiceAutoplay,
 * useRealtimeRefresh), so the count of permanently-held sockets scaled with how
 * many panels happened to be mounted. The running app was holding FIVE, leaving
 * exactly one slot for everything else.
 *
 * That is a real, measured latency, not a theory:
 *
 *     EventSources open :  0     3     5     6
 *     click -> sound    : 40ms  25ms  25ms  NEVER LOADS
 *
 * At six the audio element does not merely play late, it never fires
 * `loadedmetadata` at all. The falsifier: with six held on localhost:3001, the
 * same file served from 127.0.0.1:3001 — same server, same bytes, but its own
 * pool of six — played in 19-30ms. Close the six and localhost played in 22ms.
 *
 * So: one socket, many listeners. This is the same shape audioManager uses for
 * the one <audio> element, and it is what these files' own comments already
 * assumed existed ("the EventSource closes", singular).
 *
 * Opened lazily on the first subscriber and closed when the last one leaves, so
 * an app with nothing mounted holds no socket — the behaviour each component
 * had on its own, minus the multiplication.
 */

type Listener = (resource: string) => void;

interface Channel {
  es: EventSource;
  listeners: Set<Listener>;
}

/** Keyed by URL: dev proxies /api/events through Vite, the built app does not. */
const channels = new Map<string, Channel>();

export const SERVER_EVENTS_URL = "http://localhost:3001/api/events";

/**
 * Subscribe to server-pushed change notifications. Returns an unsubscribe
 * function — return it straight from a useEffect.
 *
 *   useEffect(() => subscribeServerEvents((resource) => {
 *     if (resource === "voice_messages") refetch();
 *   }), []);
 */
export function subscribeServerEvents(
  fn: Listener,
  url: string = SERVER_EVENTS_URL,
): () => void {
  let channel = channels.get(url);

  if (!channel) {
    const es = new EventSource(url);
    const created: Channel = { es, listeners: new Set() };

    es.onmessage = (e) => {
      let resource: unknown;
      try {
        resource = JSON.parse(e.data)?.resource;
      } catch {
        return; // malformed frame — ignore, exactly as each call site did
      }
      if (typeof resource !== "string") return;
      // Copy first: a listener may unsubscribe itself while we are iterating.
      for (const listener of [...created.listeners]) {
        try {
          listener(resource);
        } catch (err) {
          console.warn("[serverEvents] listener threw for", resource, err);
        }
      }
    };

    // EventSource reconnects on its own; tearing the channel down here would
    // turn a blip into a permanently dead feed for every subscriber.
    es.onerror = () => {};

    channels.set(url, created);
    channel = created;
  }

  channel.listeners.add(fn);

  return () => {
    const live = channels.get(url);
    if (!live) return;
    live.listeners.delete(fn);
    if (live.listeners.size === 0) {
      live.es.close();
      channels.delete(url);
    }
  };
}

/** Open channels, for diagnostics. */
export function openServerEventChannels(): number {
  return channels.size;
}
