import { useState } from "react";
import { useGetList } from "ra-core";
import { MessageSquare, ArrowLeft, Star, Copy, FileText, Filter } from "lucide-react";
import type { RaRecord } from "ra-core";

// ─── Types ────────────────────────────────────────────────────────────────────

type QAStatus = "draft" | "validated" | "published" | "rejected";
type QAClassification = "public" | "internal" | "restricted";

type QAEntry = {
  customer_name?: string | null;
  customer_id?: string | null;
  question: string;
  answer?: string | null;
  status: QAStatus;
  classification?: QAClassification | null;
  category?: string | null;
  confidence?: number | null;
  rating?: number | null;
  sources?: string[] | null;
  feedback?: string | null;
  created_at: string;
} & Pick<RaRecord, "id">;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<QAStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#9ca3af", bg: "#9ca3af20" },
  validated: { label: "Validated", color: "#10b981", bg: "#10b98120" },
  published: { label: "Published", color: "#3b82f6", bg: "#3b82f620" },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "#ef444420" },
};

const CLASSIFICATION_CONFIG: Record<QAClassification, { label: string; color: string; bg: string }> = {
  public:     { label: "Public",     color: "#10b981", bg: "#10b98120" },
  internal:   { label: "Internal",   color: "#3b82f6", bg: "#3b82f620" },
  restricted: { label: "Restricted", color: "#ef4444", bg: "#ef444420" },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QAStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Classification Badge ─────────────────────────────────────────────────────

function ClassificationBadge({ classification }: { classification?: QAClassification | null }) {
  if (!classification) return null;
  const cfg = CLASSIFICATION_CONFIG[classification] ?? CLASSIFICATION_CONFIG.internal;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Rating Stars ─────────────────────────────────────────────────────────────

function RatingStars({ rating, size = "sm" }: { rating?: number | null; size?: "sm" | "md" }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  const starSize = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={starSize}
          style={{
            fill: i <= rating ? "#f59e0b" : "transparent",
            color: i <= rating ? "#f59e0b" : "#6b7280",
          }}
        />
      ))}
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ confidence }: { confidence?: number | null }) {
  if (confidence == null) return null;
  const pct = Math.min(100, Math.max(0, (confidence / 10) * 100));
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Confidence</span>
        <span className="text-xs font-medium" style={{ color }}>{confidence}/10</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      <Copy className="w-3.5 h-3.5" />
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function QADetailView({ entry, onBack }: { entry: QAEntry; onBack: () => void }) {
  const formattedDate = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  const exportBrief = `# Q&A Brief\n\n**Date:** ${formattedDate}\n**Customer:** ${entry.customer_name ?? "Unknown"}\n**Status:** ${entry.status}\n**Category:** ${entry.category ?? "Uncategorized"}\n**Confidence:** ${entry.confidence ?? "N/A"}/10\n**Rating:** ${entry.rating ? `${entry.rating}/5` : "N/A"}\n\n## Question\n\n${entry.question}\n\n## Answer\n\n${entry.answer ?? "No answer yet."}\n\n${(entry.sources?.length ?? 0) > 0 ? `## Sources\n\n${entry.sources!.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n` : ""}${entry.feedback ? `## Feedback\n\n${entry.feedback}\n` : ""}`;

  return (
    <div className="px-6 pt-0 pb-6 max-w-3xl space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Q&A Log
      </button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={entry.status} />
          <ClassificationBadge classification={entry.classification} />
          {entry.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
              {entry.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>{formattedDate}</span>
          {entry.customer_name && <span>· {entry.customer_name}</span>}
          <RatingStars rating={entry.rating} size="md" />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</h2>
        <p className="text-base font-medium text-foreground leading-relaxed">{entry.question}</p>
      </div>

      {/* Confidence */}
      {entry.confidence != null && (
        <div className="max-w-xs">
          <ConfidenceBar confidence={entry.confidence} />
        </div>
      )}

      {/* Answer */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answer</h2>
        {entry.answer ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {entry.answer}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No answer yet.</p>
        )}
      </div>

      {/* Sources */}
      {(entry.sources?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sources ({entry.sources!.length})
          </h2>
          <ul className="space-y-1">
            {entry.sources!.map((src, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="shrink-0 text-xs font-medium text-foreground/60 mt-0.5">{i + 1}.</span>
                <span>{src}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback */}
      {entry.feedback && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feedback</h2>
          <p className="text-sm text-muted-foreground italic">{entry.feedback}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <CopyButton text={entry.answer ?? ""} label="Copy Answer" />
        <CopyButton text={exportBrief} label="Export Brief" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function QALogPage() {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rawEntries, isPending } = useGetList<QAEntry>("qa_entries", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "created_at", order: "DESC" },
  });

  if (isPending) {
    return (
      <div className="px-6 pt-0 pb-6 max-w-5xl space-y-3">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const allEntries = rawEntries ?? [];
  const selectedEntry = selectedId != null ? allEntries.find((e) => e.id === selectedId) : null;

  // Detail view
  if (selectedEntry) {
    return <QADetailView entry={selectedEntry} onBack={() => setSelectedId(null)} />;
  }

  // Filter entries
  const filtered = allEntries.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (searchQuery && !e.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="px-6 pt-0 pb-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-foreground">Q&amp;A Log</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Customer questions and validated answers.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="validated">Validated</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-md border bg-background px-3 py-1 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {(statusFilter !== "all" || searchQuery) && (
          <button
            onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {allEntries.length === 0
              ? "No Q&A entries yet. Ask the agent a question to get started."
              : "No entries match your filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_180px_100px_80px_60px] gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Question</span>
            <span>Customer</span>
            <span>Date</span>
            <span>Status</span>
            <span>Rating</span>
            <span className="text-right">Src</span>
          </div>
          {/* Rows */}
          {filtered.map((entry) => {
            const date = entry.created_at
              ? new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—";
            const truncated = entry.question.length > 60 ? entry.question.slice(0, 60) + "…" : entry.question;
            return (
              <button
                key={String(entry.id)}
                onClick={() => setSelectedId(entry.id)}
                className="w-full grid grid-cols-[1fr_140px_180px_100px_80px_60px] gap-3 px-4 py-3 text-left border-b last:border-b-0 hover:bg-muted/30 transition-colors group"
              >
                <span className="text-sm text-foreground group-hover:text-foreground truncate">{truncated}</span>
                <span className="text-xs text-muted-foreground truncate">{entry.customer_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{date}</span>
                <span><StatusBadge status={entry.status} /></span>
                <span><RatingStars rating={entry.rating} /></span>
                <span className="text-xs text-muted-foreground text-right">{entry.sources?.length ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

QALogPage.path = "/qa-log";
