import { useEffect, useState } from "react";
import { useGetList } from "ra-core";
import {
  Brain,
  Target,
  User,
  BookOpen,
  ScrollText,
  Activity,
  MessageSquare,
  Zap,
} from "lucide-react";
import type { PageContent } from "../types";
import { SectionRenderer } from "../sections/SectionRenderer";
import type { SectionData } from "../sections/registry";

const GREEN = "#3fb950";

// ── Types ──────────────────────────────────────────────────────────────────

type MemoryContent = {
  title?: string;
  sections?: SectionData[];
};

type ActivityEntry = {
  id: number;
  type: "qa" | "kb" | "automation";
  title: string;
  detail: string;
  timestamp: string;
};

// ── Tab definitions ────────────────────────────────────────────────────────

type TabId = "goal" | "profile" | "principles" | "lessons" | "activity";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "goal", label: "Goal", icon: <Target className="w-3.5 h-3.5" /> },
  { id: "profile", label: "User Profile", icon: <User className="w-3.5 h-3.5" /> },
  { id: "principles", label: "Principles", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "lessons", label: "Lessons Learned", icon: <ScrollText className="w-3.5 h-3.5" /> },
  { id: "activity", label: "Activity Log", icon: <Activity className="w-3.5 h-3.5" /> },
];

const SLUG_MAP: Record<Exclude<TabId, "activity">, string> = {
  goal: "memory/goal",
  profile: "memory/profile",
  principles: "memory/principles",
  lessons: "memory/lessons",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDayHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function dayKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

// ── Page-content tab (Goal / Profile / Principles / Lessons) ──────────────

function PageContentTab({ slug, placeholder }: { slug: string; placeholder: string }) {
  const { data: allPages, isPending } = useGetList<PageContent<MemoryContent>>("page_content", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "page_slug", order: "ASC" },
  });

  if (isPending) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 rounded bg-muted" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    );
  }

  const entry = allPages?.find((p) => p.page_slug === slug);

  if (!entry) {
    return (
      <p className="text-sm text-muted-foreground italic">{placeholder}</p>
    );
  }

  const content = entry.content;

  return (
    <div>
      {content?.title && (
        <h2 className="text-base font-semibold text-foreground mb-4">{content.title}</h2>
      )}
      {content?.sections && content.sections.length > 0 ? (
        <SectionRenderer sections={content.sections} />
      ) : (
        <p className="text-sm text-muted-foreground italic">{placeholder}</p>
      )}
    </div>
  );
}

// ── Activity log tab ───────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<ActivityEntry["type"], React.ReactNode> = {
  qa: <MessageSquare className="w-4 h-4" style={{ color: "#58a6ff" }} />,
  kb: <BookOpen className="w-4 h-4" style={{ color: "#a78bfa" }} />,
  automation: <Zap className="w-4 h-4" style={{ color: "#f0883e" }} />,
};

const ACTIVITY_COLOR: Record<ActivityEntry["type"], string> = {
  qa: "#58a6ff",
  kb: "#a78bfa",
  automation: "#f0883e",
};

function ActivityLogTab() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qaRes, kbRes, autoRes] = await Promise.all([
          fetch("http://localhost:3001/api/qa_entries"),
          fetch("http://localhost:3001/api/kb_pages"),
          fetch("http://localhost:3001/api/automations"),
        ]);
        const qaData = await qaRes.json();
        const kbData = await kbRes.json();
        const autoData = await autoRes.json();

        const entries: ActivityEntry[] = [];

        (qaData || []).forEach((qa: any) => {
          entries.push({
            id: qa.id,
            type: "qa",
            title: qa.question?.slice(0, 90) || "Question",
            detail: `${qa.customer || "Unknown"} — ${qa.status} — confidence ${qa.confidence}/10`,
            timestamp: qa.created_at || "",
          });
        });

        (kbData || []).forEach((kb: any) => {
          entries.push({
            id: 1000 + kb.id,
            type: "kb",
            title: `KB: ${kb.title}`,
            detail: kb.slug,
            timestamp: kb.created_at || "",
          });
        });

        (autoData || []).forEach((auto: any) => {
          entries.push({
            id: 2000 + auto.id,
            type: "automation",
            title: `Automation: ${auto.title}`,
            detail: auto.status || "active",
            timestamp: auto.created_at || "",
          });
        });

        entries.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
        setActivities(entries);
      } catch (err) {
        console.error("Failed to load activities:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-6 text-center">
        No activity yet. Ask a question or run an automation to get started.
      </p>
    );
  }

  // Group by day
  const grouped = new Map<string, ActivityEntry[]>();
  activities.forEach((entry) => {
    const key = dayKey(entry.timestamp);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  });

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([day, entries]) => (
        <div key={day}>
          {/* Day header */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {formatDayHeader(entries[0].timestamp)}
          </div>

          {/* Entries */}
          <div
            className="relative pl-4"
            style={{ borderLeft: "2px solid color-mix(in srgb, #3fb950 20%, transparent)" }}
          >
            {entries.map((entry, idx) => (
              <div key={entry.id}>
                <div className="flex items-start gap-3 py-2.5">
                  {/* Icon dot */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${ACTIVITY_COLOR[entry.type]} 12%, transparent)`,
                    }}
                  >
                    {ACTIVITY_ICON[entry.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground leading-snug">
                      {entry.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{entry.detail}</div>
                  </div>

                  {/* Time */}
                  {entry.timestamp && (
                    <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                      {formatTime(entry.timestamp)}
                    </div>
                  )}
                </div>

                {/* Divider between entries, not after last */}
                {idx < entries.length - 1 && (
                  <div className="border-t border-border/30 ml-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function MemoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      return (localStorage.getItem("memory-active-tab") as TabId) || "goal";
    } catch {
      return "goal";
    }
  });

  function handleTabChange(id: TabId) {
    setActiveTab(id);
    try {
      localStorage.setItem("memory-active-tab", id);
    } catch {
      // ignore
    }
  }

  return (
    <div className="px-6 pt-4 pb-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${GREEN} 15%, transparent)` }}
        >
          <Brain className="w-5 h-5" style={{ color: GREEN }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Memory</h1>
          <p className="text-sm text-muted-foreground">
            Identity, principles, and history — the living brain.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors relative"
              style={{
                color: isActive ? GREEN : undefined,
                borderBottom: isActive ? `2px solid ${GREEN}` : "2px solid transparent",
                marginBottom: "-1px",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "activity" ? (
          <ActivityLogTab />
        ) : (
          <PageContentTab
            slug={SLUG_MAP[activeTab]}
            placeholder={`No ${activeTab} content yet. The agent will populate this.`}
          />
        )}
      </div>
    </div>
  );
}

MemoryPage.path = "/kb/memory";
