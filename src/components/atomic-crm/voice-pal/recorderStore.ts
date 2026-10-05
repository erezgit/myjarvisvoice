import { useEffect, useState } from "react";

/**
 * The meeting recorder, as the app sees it. Two owners again, like autoplay: the
 * Record BUTTON lives in the bottom bar (Layout) and the transcript PANEL is its
 * own page — so the state is a tiny shared store, polled from the server.
 *
 * Polled, not pushed: /api/record/status is a cheap local read, and an extra
 * EventSource would eat one of the six localhost:3001 sockets (see serverEvents).
 */
const API = "http://localhost:3001/api/record";
const UNREACHABLE = "voice server not reachable";

export type RecorderState = {
  recording: boolean;
  meeting_id?: number;
  last_meeting_id?: number | null;
  chunks?: number;
  transcribed?: number;
  busy: boolean; // a start/stop request is in flight
  error: string | null;
};

let state: RecorderState = { recording: false, busy: false, error: null };
const subscribers = new Set<(s: RecorderState) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function set(patch: Partial<RecorderState>) {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn(state));
}

async function poll() {
  try {
    const r = await fetch(`${API}/status`);
    const s = await r.json();
    set({
      recording: !!s.recording, meeting_id: s.meeting_id, last_meeting_id: s.last_meeting_id,
      chunks: s.chunks, transcribed: s.transcribed,
      // Clear only our own "unreachable" note; a start/stop error stays until the next click.
      ...(state.error === UNREACHABLE ? { error: null } : {}),
    });
  } catch {
    // The API server is down — say so rather than show a stale "recording".
    set({ recording: false, error: UNREACHABLE });
  }
}

export async function startRecording(): Promise<boolean> {
  set({ busy: true, error: null });
  try {
    const r = await fetch(`${API}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const body = await r.json();
    // 409 = already recording: not an error, just show it.
    if (!r.ok && r.status !== 409) { set({ error: body.error || `start failed (${r.status})` }); return false; }
    await poll();
    return true;
  } catch (e: any) {
    set({ error: e?.message || "start failed" });
    return false;
  } finally {
    set({ busy: false });
  }
}

export async function stopRecording(): Promise<void> {
  set({ busy: true, error: null });
  try {
    const r = await fetch(`${API}/stop`, { method: "POST" });
    if (!r.ok && r.status !== 409) set({ error: (await r.json()).error || `stop failed (${r.status})` });
  } catch (e: any) {
    set({ error: e?.message || "stop failed" });
  } finally {
    await poll();
    set({ busy: false });
  }
}

export function useRecorder(): RecorderState {
  const [value, setValue] = useState(state);
  useEffect(() => {
    subscribers.add(setValue);
    if (!timer) { void poll(); timer = setInterval(poll, 3000); }
    return () => {
      subscribers.delete(setValue);
      if (!subscribers.size && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return value;
}
