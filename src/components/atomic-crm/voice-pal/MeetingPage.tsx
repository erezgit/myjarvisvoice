import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Copy } from "lucide-react";
import { useRecorder } from "./recorderStore";
import { RecordButton } from "./RecordButton";
import { subscribeServerEvents } from "@/lib/serverEvents";

/**
 * The transcript of one recording made on this Mac. Two routes share it:
 *   /voice-pal/meeting          — the CURRENT recording, opened by the Record button
 *   /voice-pal/recordings/:id   — any past recording, opened from the Recordings list
 * Either way it polls, so a recording still being transcribed keeps filling.
 *
 * The recorder closes a chunk at every pause, one per sentence, per track (mic = Erez, system audio =
 * the others), so a line arrives a second or two after the sentence ends and the two tracks
 * land out of order — they are sorted by start time here, never by arrival.
 */
type Row = {
  id: number;
  speaker_name: string;
  is_host: boolean;
  words: string;
  start_ts: number;
  language: string | null;
};

type Meeting = { id: number; title: string; status: string };

const HEBREW = /[֐-׿]/;

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MeetingPage() {
  const rec = useRecorder();
  const navigate = useNavigate();
  const { id } = useParams();
  const meetingId = id ? Number(id) : (rec.meeting_id ?? rec.last_meeting_id ?? null);
  // The recorder's live state only describes THIS page when it is showing the live recording.
  const isLive = rec.recording && rec.meeting_id === (meetingId ?? rec.meeting_id);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const afterRef = useRef(0);
  const shownRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A new meeting starts a fresh transcript.
    if (meetingId !== shownRef.current) {
      shownRef.current = meetingId;
      afterRef.current = 0;
      setRows([]);
      setMeeting(null);
    }
    let cancelled = false;
    const load = async () => {
      try {
        const q = meetingId ? `meeting_id=${meetingId}&` : "";
        const r = await fetch(`http://localhost:3001/api/record/transcript?${q}after=${afterRef.current}`);
        const body = await r.json();
        if (cancelled) return;
        if (!r.ok) { setError(body.error || `HTTP ${r.status}`); return; }
        setError(null);
        // With no meeting id yet the server picks the newest recording — adopt it.
        if (shownRef.current !== body.meeting.id) {
          shownRef.current = body.meeting.id;
          afterRef.current = 0;
          setRows(body.rows);
        } else if (body.rows.length) {
          setRows((prev) => [...prev, ...body.rows]);
        }
        setMeeting(body.meeting);
        if (body.rows.length) afterRef.current = Math.max(afterRef.current, ...body.rows.map((x: Row) => Number(x.id)));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "could not load transcript");
      }
    };
    void load();
    // Pushed: the server announces "recording" the moment the transcriber writes a line.
    // The slow poll is only a backstop in case an event is missed.
    const off = subscribeServerEvents((resource) => { if (resource === "recording") void load(); });
    const t = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(t); off(); };
  }, [meetingId]);

  const sorted = [...rows].sort((a, b) => Number(a.start_ts) - Number(b.start_ts));

  // Follow the newest line, as a live transcript should.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [rows.length]);

  const copyAll = () =>
    navigator.clipboard.writeText(sorted.map((r) => `[${clock(Number(r.start_ts))}] ${r.speaker_name}: ${r.words}`).join("\n"));

  const finishing = !isLive && meeting?.status === "recording";

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          title="All recordings"
          onClick={() => navigate("/voice-pal/recordings")}
          className="-ml-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${isLive ? "animate-pulse bg-green-500" : "bg-muted-foreground/40"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{meeting?.title ?? "Meeting"}</div>
          <div className="text-[11px] text-muted-foreground">
            {isLive
              ? `Recording · ${rec.transcribed ?? 0} of ${rec.chunks ?? 0} sentences transcribed · lines appear as each one ends`
              : finishing
                ? "Stopped · transcribing the last pieces"
                : meeting
                  ? "Stopped"
                  : "Start one from the Recordings page"}
          </div>
        </div>
        {isLive && <RecordButton />}
        {sorted.length > 0 && (
          <button
            type="button"
            title="Copy the whole transcript"
            onClick={copyAll}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>

      {(error || rec.error) && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {rec.error || error}
        </div>
      )}

      <div className="flex-1 space-y-2 px-4 py-3">
        {sorted.map((r) => {
          const rtl = HEBREW.test(r.words);
          const me = r.is_host;
          return (
            <div key={r.id} className={`flex ${me ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  me ? "bg-blue-500/15 text-foreground" : "border border-border bg-card text-foreground"
                }`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="font-medium">{me ? "You" : r.speaker_name}</span>
                  <span className="tabular-nums">{clock(Number(r.start_ts))}</span>
                </div>
                <p dir={rtl ? "rtl" : "ltr"} className="text-[14px] leading-relaxed" style={{ textAlign: rtl ? "right" : "left" }}>
                  {r.words}
                </p>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && !error && (
          <div className="py-24 text-center">
            <div className="mb-3 text-4xl">🎙️</div>
            <p className="text-sm text-muted-foreground">
              {isLive ? "Listening — each line appears when its sentence ends" : "No transcript yet"}
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

MeetingPage.path = "/voice-pal/meeting";
MeetingPage.detailPath = "/voice-pal/recordings/:id";
