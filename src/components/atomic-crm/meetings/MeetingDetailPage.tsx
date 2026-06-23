import { useState, useEffect, useRef } from "react";
import { useGetOne, useGetList, useUpdate, useNotify } from "ra-core";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Mic,
  MicOff,
  Radio,
  Square,
  Link2,
  User,
  CheckCircle2,
  Edit2,
  Check,
} from "lucide-react";
import { SectionRenderer } from "../sections/SectionRenderer";
import type { SectionData } from "../sections/registry";

const ATTENDEE_COLORS: Record<string, string> = {
  Erez: "#a78bfa",
  Yaron: "#60a5fa",
  Dvir: "#34d399",
  Tom: "#fbbf24",
  "Michaela Eichinger": "#f59e0b",
};

type Meeting = {
  id: number;
  title: string;
  date: string;
  duration: string;
  location: string;
  attendees: string[];
  recording: string;
  summary: string;
  content: Record<string, unknown>;
  status: string;
  meeting_url: string;
  bot_id: string;
};

type TranscriptRow = {
  id: number;
  bot_id: string;
  speaker_name: string;
  speaker_id: string;
  is_host: number;
  words: string;
  start_timestamp: string;
  end_timestamp: string;
  event_type: string;
  created_at: string;
};

// Section type labels for auto-titling
const SECTION_TITLES: Record<string, string> = {
  decisions: "Key Decisions",
  action_items: "Action Items",
  open_questions: "Open Questions",
  deep_dives: "Deep Dives",
  timeline: "Meeting Flow",
  contacts: "Contacts",
  debates: "Key Debates",
  transcript: "Transcript",
  checklist: "Checklist",
  kpi_cards: "KPIs",
  key_value: "Details",
  markdown: "Notes",
  table: "Data",
};

function contentToSections(content: Record<string, unknown>): SectionData[] {
  const sections: SectionData[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (!value || (Array.isArray(value) && value.length === 0)) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) continue;
    const type = key;
    const title = SECTION_TITLES[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (type in SECTION_TITLES) {
      sections.push({ type, title, data: value });
    }
  }
  return sections;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(tsStr: string) {
  if (!tsStr) return "";
  try {
    return new Date(tsStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return tsStr;
  }
}

// =====================
// Recording Controls
// =====================
function RecordingControls({ meeting, onChanged }: { meeting: Meeting; onChanged?: () => void }) {
  const notify = useNotify();
  const [isLoading, setIsLoading] = useState(false);
  const [update] = useUpdate();

  const isLive = meeting.status === "live";

  async function handleStart() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/meetings/start-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "Failed to start recording", { type: "error" });
      } else {
        notify("Recording started — Jarvis bot is joining the meeting", { type: "success" });
        onChanged?.();
      }
    } catch (err: any) {
      notify(err.message || "Network error", { type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStop() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/meetings/stop-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "Failed to stop recording", { type: "error" });
      } else {
        notify("Recording stopped", { type: "info" });
        onChanged?.();
      }
    } catch (err: any) {
      notify(err.message || "Network error", { type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLive) {
    return (
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          Live Recording
        </div>
        <button
          onClick={handleStop}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Square className="w-4 h-4" />
          {isLoading ? "Stopping..." : "Stop Recording"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStart}
      disabled={isLoading || !meeting.meeting_url}
      title={!meeting.meeting_url ? "Set a meeting URL first" : "Start Jarvis bot recording"}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Mic className="w-4 h-4" />
      {isLoading ? "Starting..." : "Start Recording"}
    </button>
  );
}

// =====================
// Editable Meeting URL
// =====================
function MeetingUrlField({ meeting }: { meeting: Meeting }) {
  const notify = useNotify();
  const [update] = useUpdate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(meeting.meeting_url || "");

  function handleSave() {
    update(
      "meetings",
      { id: meeting.id, data: { meeting_url: value }, previousData: meeting },
      {
        onSuccess: () => {
          notify("Meeting URL saved", { type: "success" });
          setEditing(false);
        },
        onError: (err: any) => {
          notify(err?.message || "Failed to save URL", { type: "error" });
        },
      }
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          className="flex-1 bg-background border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
        <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-400">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground text-xs">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
      {meeting.meeting_url ? (
        <a
          href={meeting.meeting_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 underline truncate max-w-xs"
        >
          {meeting.meeting_url}
        </a>
      ) : (
        <span className="text-sm text-muted-foreground italic">No meeting URL set</span>
      )}
      <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground ml-1">
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// =====================
// Live Transcript
// =====================
function LiveTranscript({ botId, isLive }: { botId: string; isLive?: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: rows } = useGetList<TranscriptRow>("meeting_transcript", {
    filter: { "bot_id@eq": botId },
    pagination: { page: 1, perPage: 500 },
    sort: { field: "created_at", order: "ASC" },
  }, {
    refetchInterval: isLive ? 5000 : false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows?.length]);

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <Mic className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Waiting for transcript... The bot will start sending words once it joins the call.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
        <Radio className="w-4 h-4 text-red-400 animate-pulse" />
        <span className="text-sm font-medium text-foreground">Live Transcript</span>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} segments</span>
      </div>
      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        {rows.map((row) => {
          const speakerColor = ATTENDEE_COLORS[row.speaker_name] ?? "#a1a1aa";
          return (
            <div key={row.id} className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: `${speakerColor}30`, color: speakerColor }}
              >
                {row.speaker_name ? row.speaker_name[0] : <User className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: speakerColor }}>
                    {row.speaker_name || "Unknown"}
                  </span>
                  {row.start_timestamp && (
                    <span className="text-xs text-muted-foreground">{formatTime(row.start_timestamp)}</span>
                  )}
                  {row.is_host === 1 && (
                    <span className="text-xs text-amber-500 font-medium">(host)</span>
                  )}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{row.words}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// =====================
// Main Page
// =====================
export function MeetingDetailPage() {
  const { id } = useParams();
  const { data: meeting, isPending, refetch } = useGetOne<Meeting>("meetings", { id });

  if (isPending) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-12 w-96 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6">
        <Link to="/meetings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Meetings
        </Link>
        <p className="text-muted-foreground">Meeting not found.</p>
      </div>
    );
  }

  const sections = contentToSections(meeting.content ?? {});
  const isLive = meeting.status === "live";

  return (
    <div className="px-6 pb-6 pt-0 max-w-5xl space-y-6">
      {/* Back link */}
      <Link to="/meetings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Meetings
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold text-foreground">{meeting.title}</h1>
          <RecordingControls meeting={meeting} onChanged={refetch} />
        </div>

        {meeting.summary && (
          <p className="text-sm text-muted-foreground mb-4">{meeting.summary}</p>
        )}

        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(meeting.date)}
          </span>
          {meeting.duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {meeting.duration}
            </span>
          )}
          {meeting.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {meeting.location}
            </span>
          )}
          {meeting.recording && (
            <span className="inline-flex items-center gap-1.5">
              <Mic className="w-4 h-4" />
              {meeting.recording}
            </span>
          )}
        </div>

        {/* Meeting URL */}
        <div className="mb-4">
          <MeetingUrlField meeting={meeting} />
        </div>

        {/* Attendees */}
        {meeting.attendees?.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {meeting.attendees?.map((name) => {
                const color = ATTENDEE_COLORS[name] ?? "#a1a1aa";
                return (
                  <div
                    key={name}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${color}30`, color }}
                    >
                      {name[0]}
                    </div>
                    <span className="text-sm font-medium" style={{ color }}>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Live Transcript — shown when recording is active or bot_id exists */}
      {(isLive || meeting.bot_id) && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            {isLive ? (
              <>
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                Live Transcript
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Recording Transcript
              </>
            )}
          </h2>
          <LiveTranscript botId={meeting.bot_id} isLive={isLive} />
        </div>
      )}

      {/* Meeting content rendered through standard SectionRenderer */}
      {sections.length > 0 ? (
        <SectionRenderer sections={sections} />
      ) : (
        !isLive && (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No meeting content recorded yet.</p>
          </div>
        )
      )}
    </div>
  );
}

MeetingDetailPage.path = "/meetings/:id";
