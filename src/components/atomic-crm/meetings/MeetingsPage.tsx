import { useState } from "react";
import { useGetList, useCreate, useNotify } from "ra-core";
import { Link } from "react-router";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  CheckCircle2,
  CalendarClock,
  XCircle,
  MessageSquare,
  Radio,
  Plus,
  X,
} from "lucide-react";

const BLUE = "#3b82f6";

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
  status: "scheduled" | "completed" | "cancelled" | "live";
  meeting_url: string;
  bot_id: string;
  created_at: string;
};

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Completed" },
  scheduled: { icon: CalendarClock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Scheduled" },
  cancelled: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Cancelled" },
  live: { icon: Radio, color: "text-red-400", bg: "bg-red-400/10", label: "Live" },
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function CreateMeetingDialog({ onClose }: { onClose: () => void }) {
  const [create, { isPending }] = useCreate();
  const notify = useNotify();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [attendees, setAttendeesStr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const attendeesArr = attendees
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    create(
      "meetings",
      {
        data: {
          title: title.trim(),
          date,
          meeting_url: meetingUrl.trim(),
          location: location.trim(),
          attendees: attendeesArr,
          status: "scheduled",
          summary: "",
          content: {},
        },
      },
      {
        onSuccess: () => {
          notify("Meeting created", { type: "success" });
          onClose();
        },
        onError: (err: any) => {
          notify(err?.message || "Failed to create meeting", { type: "error" });
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">New Meeting</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title *</label>
            <input
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date & Time</label>
            <input
              type="datetime-local"
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Google Meet URL</label>
            <input
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
            <input
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Google Meet / Office / etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Attendees (comma-separated)</label>
            <input
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={attendees}
              onChange={(e) => setAttendeesStr(e.target.value)}
              placeholder="Alice, Bob, Charlie"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MeetingsPage() {
  const { data: meetings, isPending } = useGetList<Meeting>("meetings", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "date", order: "DESC" },
  });

  const [showCreate, setShowCreate] = useState(false);

  if (isPending) {
    return (
      <div className="px-6 pb-6 pt-0 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-0 max-w-5xl">
      {showCreate && <CreateMeetingDialog onClose={() => setShowCreate(false)} />}

      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${BLUE} 15%, transparent)` }}
        >
          <MessageSquare className="w-5 h-5" style={{ color: BLUE }} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            {meetings?.length ?? 0} meeting{(meetings?.length ?? 0) !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </button>
      </div>

      <div className="space-y-3">
        {meetings?.map((meeting) => {
          const status = statusConfig[meeting.status] ?? statusConfig.completed;
          const StatusIcon = status.icon;
          const content = meeting.content as { decisions?: unknown[] };
          const decisionCount = content?.decisions?.length ?? 0;
          const isLive = meeting.status === "live";

          return (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="block group"
            >
              <div className={`rounded-xl border bg-card p-5 transition-colors hover:bg-accent/50 ${isLive ? "border-red-500/40 ring-1 ring-red-500/20" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-violet-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className={`w-3 h-3 ${isLive ? "animate-pulse" : ""}`} />
                        {status.label}
                      </span>
                    </div>

                    {meeting.summary && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {meeting.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(meeting.date)}
                      </span>
                      {meeting.duration && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {meeting.duration}
                        </span>
                      )}
                      {meeting.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {meeting.location}
                        </span>
                      )}
                      {meeting.attendees?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {meeting.attendees?.join(", ")}
                        </span>
                      )}
                      {decisionCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {decisionCount} decision{decisionCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors mt-1 shrink-0" />
                </div>
              </div>
            </Link>
          );
        })}

        {(!meetings || meetings.length === 0) && (
          <div className="rounded-xl border bg-card p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No meetings yet</h3>
            <p className="text-sm text-muted-foreground">
              Create a meeting above or wait for meeting notes to appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

MeetingsPage.path = "/meetings";
