import { useRef } from "react";
import { useGetList } from "ra-core";
import { TrendingUp } from "lucide-react";
import type { RaRecord } from "ra-core";
import { DownloadButton } from "../shared/DownloadButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type QAStatus = "draft" | "validated" | "published" | "rejected";

type QAEntry = {
  customer_name?: string | null;
  question: string;
  status: QAStatus;
  category?: string | null;
  rating?: number | null;
  created_at: string;
} & Pick<RaRecord, "id">;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<QAStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#9ca3af", bg: "#9ca3af20" },
  validated: { label: "Validated", color: "#10b981", bg: "#10b98120" },
  published: { label: "Published", color: "#3b82f6", bg: "#3b82f620" },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "#ef444420" },
};

const CATEGORY_COLORS: Record<string, string> = {
  hardware_specs:       "#a78bfa",
  code_examples:        "#60a5fa",
  system_config:        "#34d399",
  fpga_waveform:        "#f0883e",
  multi_chassis:        "#f59e0b",
  software_integration: "#ec4899",
  general:              "#6b7280",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color = "#a78bfa",
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex-1 min-w-[130px]">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── Status Badge (inline) ────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function InsightsPage() {
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: rawEntries, isPending } = useGetList<QAEntry>("qa_entries", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "created_at", order: "DESC" },
  });

  if (isPending) {
    return (
      <div className="px-6 pt-0 pb-6 max-w-5xl space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 flex-1 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const entries = rawEntries ?? [];

  if (entries.length === 0) {
    return (
      <div className="px-6 pt-0 pb-6 max-w-5xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          </div>
          <p className="text-sm text-muted-foreground">Q&amp;A activity analytics.</p>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Start answering questions to see insights here.</p>
        </div>
      </div>
    );
  }

  // ─── Compute KPIs ──────────────────────────────────────────────────────────

  const totalCount = entries.length;

  const validatedCount = entries.filter(
    (e) => e.status === "validated" || e.status === "published"
  ).length;

  const ratedEntries = entries.filter((e) => (e.rating ?? 0) > 0);
  const avgRating =
    ratedEntries.length > 0
      ? (ratedEntries.reduce((sum, e) => sum + (e.rating ?? 0), 0) / ratedEntries.length).toFixed(1)
      : "—";

  const categoryCounts: Record<string, number> = {};
  for (const e of entries) {
    const cat = e.category ?? "general";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const topCategoryLabel = topCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // ─── Category Bars ─────────────────────────────────────────────────────────

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = sortedCategories[0]?.[1] ?? 1;

  // ─── Recent 5 ──────────────────────────────────────────────────────────────

  const recentEntries = entries.slice(0, 5);

  return (
    <div className="px-6 pt-0 pb-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          </div>
          <p className="text-sm text-muted-foreground">Q&amp;A activity analytics.</p>
        </div>
        <DownloadButton contentRef={contentRef} filename="QM-Insights" />
      </div>

      <div ref={contentRef} className="space-y-6 bg-background rounded-xl p-6">

      {/* KPI Row */}
      <div className="flex gap-3 flex-wrap">
        <KpiCard
          label="Total Q&As"
          value={totalCount}
          color="#3b82f6"
        />
        <KpiCard
          label="Validated"
          value={validatedCount}
          color="#10b981"
          sub={`${Math.round((validatedCount / totalCount) * 100)}% of total`}
        />
        <KpiCard
          label="Avg Rating"
          value={avgRating}
          color="#f59e0b"
          sub={ratedEntries.length > 0 ? `from ${ratedEntries.length} rated` : "no ratings yet"}
        />
        <KpiCard
          label="Top Category"
          value={topCategoryLabel}
          color="#a78bfa"
          sub={`${categoryCounts[topCategory] ?? 0} entries`}
        />
      </div>

      {/* Questions by Category */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Questions by Category</h2>
        <div className="space-y-3">
          {sortedCategories.map(([cat, count]) => {
            const pct = Math.round((count / maxCategoryCount) * 100);
            const color = CATEGORY_COLORS[cat] ?? "#6b7280";
            const label = cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground font-medium">{count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="divide-y">
          {recentEntries.map((entry) => {
            const date = entry.created_at
              ? new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            const truncated =
              entry.question.length > 70 ? entry.question.slice(0, 70) + "…" : entry.question;
            return (
              <div key={String(entry.id)} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-muted-foreground w-14 shrink-0">{date}</span>
                <span className="text-sm text-foreground flex-1 truncate">{truncated}</span>
                <StatusBadge status={entry.status} />
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

InsightsPage.path = "/insights";
