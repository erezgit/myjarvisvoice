import { useState } from "react";
import {
  Blocks,
  Type,
  LayoutList,
  ListChecks,
  Code2,
  MessageSquareQuote,
  ArrowDownUp,
  BarChart3,
  Clock,
  Columns3,
  Table2,
  Tag,
  TrendingUp,
  GitBranch,
  Image,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Server,
  Database,
  Globe,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────
// Block Library — Visual Component Showcase
// ─────────────────────────────────────────────

// === BLOCK 1: Section Header ===
function SectionHeaderBlock({
  icon: Icon,
  title,
  subtitle,
  badge,
  color = "hsl(var(--primary))",
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  badge?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
      )}
    </div>
  );
}

// === BLOCK 2: Info Card (left border accent) ===
function InfoCardBlock({
  title,
  items,
  color = "hsl(var(--primary))",
  icon: Icon,
}: {
  title: string;
  items: string[];
  color?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4" style={{ color }} />}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// === BLOCK 3: Stat Card (top border accent) ===
function StatCardBlock({
  value,
  label,
  description,
  color = "hsl(var(--primary))",
}: {
  value: string;
  label: string;
  description?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-sm font-medium text-foreground mt-1">{label}</div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  );
}

// === BLOCK 4: Step Flow ===
function StepFlowBlock({
  steps,
}: {
  steps: { label: string; description: string; color: string }[];
}) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i}>
          <div className="flex items-start gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${step.color} 15%, transparent)`,
                color: step.color,
              }}
            >
              {i + 1}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{step.label}</div>
              <div className="text-xs text-muted-foreground">{step.description}</div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="ml-3.5 h-3 border-l-2 border-dashed border-border" />
          )}
        </div>
      ))}
    </div>
  );
}

// === BLOCK 5: Callout ===
function CalloutBlock({
  text,
  variant = "info",
}: {
  text: string;
  variant?: "info" | "success" | "warning" | "quote";
}) {
  const styles = {
    info:    { color: "#5E81AC", icon: Info },
    success: { color: "#A3BE8C", icon: CheckCircle2 },
    warning: { color: "#D08770", icon: AlertTriangle },
    quote:   { color: "#B48EAD", icon: MessageSquareQuote },
  };
  const s = styles[variant];
  const IconComp = s.icon;
  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3 border"
      style={{
        backgroundColor: `color-mix(in srgb, ${s.color} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${s.color} 25%, transparent)`,
      }}
    >
      <IconComp className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
      <p className={`text-sm ${variant === "quote" ? "italic" : ""}`} style={{ color: s.color }}>{text}</p>
    </div>
  );
}

// === BLOCK 6: Code Block ===
function CodeBlockBlock({
  code,
  language = "typescript",
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
      </div>
      <pre className="p-4 overflow-x-auto bg-muted/30">
        <code className="text-sm font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}

// === BLOCK 7: List Row ===
function ListRowBlock({
  items,
}: {
  items: { label: string; value: string; status?: "online" | "offline" | "warning" | "neutral" }[];
}) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-red-500",
    warning: "bg-amber-500",
    neutral: "bg-muted-foreground/40",
  };
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            {item.status && (
              <div className={`w-2 h-2 rounded-full ${statusColors[item.status]}`} />
            )}
            <span className="text-sm text-foreground">{item.label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// === BLOCK 8: Timeline ===
function TimelineBlock({
  entries,
}: {
  entries: { date: string; title: string; description?: string; color: string }[];
}) {
  return (
    <div className="space-y-0">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: entry.color }}
            />
            {i < entries.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[24px]" />
            )}
          </div>
          <div className="pb-4">
            <div className="text-xs text-muted-foreground">{entry.date}</div>
            <div className="text-sm font-medium text-foreground">{entry.title}</div>
            {entry.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{entry.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// === BLOCK 9: Grid Layout ===
function GridBlock({
  columns = 3,
  children,
}: {
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const colClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
  return <div className={`grid ${colClass[columns]} gap-3`}>{children}</div>;
}

// === BLOCK 10: Card Grid (navigation cards) ===
function CardGridBlock({
  items,
}: {
  items: { icon: React.ElementType; title: string; description: string; color: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted/60 cursor-pointer group"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${item.color} 15%, transparent)` }}
          >
            <item.icon className="w-4 h-4" style={{ color: item.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground group-hover:text-foreground truncate">
              {item.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// === BLOCK 11: Progress Bar ===
function ProgressBarBlock({
  value,
  label,
  color = "hsl(var(--primary))",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// === BLOCK 12: Tag List ===
function TagListBlock({
  tags,
}: {
  tags: { label: string; color: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
            color: tag.color,
          }}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

// === BLOCK 13: Data Table ===
function DataTableBlock({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/50">
          {headers.map((h, i) => (
            <th
              key={i}
              className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-border">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5 text-foreground">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// === BLOCK 14: Expandable Section ===
function ExpandableSectionBlock({
  title,
  children,
  defaultOpen = false,
  color = "hsl(var(--primary))",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">{children}</div>
      )}
    </div>
  );
}

// === BLOCK 15: Comparison Panel ===
function ComparisonBlock({
  left,
  right,
}: {
  left: { title: string; items: string[]; color: string };
  right: { title: string; items: string[]; color: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[left, right].map((side, i) => (
        <div
          key={i}
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: `color-mix(in srgb, ${side.color} 5%, transparent)`,
            borderColor: `color-mix(in srgb, ${side.color} 25%, transparent)`,
          }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: side.color }}>
            {side.title}
          </h4>
          <ul className="space-y-1">
            {side.items.map((item, j) => (
              <li key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Circle className="w-1.5 h-1.5 flex-shrink-0" style={{ color: side.color, fill: side.color }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Library Page — Showcases all blocks
// ─────────────────────────────────────────────

export const BlockLibraryPage = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 px-6 space-y-10 min-h-full bg-muted/50">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Blocks className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Block Library</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          15 composable blocks for knowledge base pages. Each block is JSON-drivable and supports light + dark mode.
        </p>
      </div>

      <Separator />

      {/* 1. Section Header */}
      <ShowcaseSection title="Section Header" description="Page and section titles with icon and optional badge.">
        <SectionHeaderBlock
          icon={Server}
          title="System Architecture"
          subtitle="Core infrastructure and service boundaries"
          badge="v2.3"
          color="#5E81AC"
        />
        <div className="mt-4" />
        <SectionHeaderBlock
          icon={TrendingUp}
          title="Growth Metrics"
          subtitle="Key performance indicators"
          color="#A3BE8C"
        />
      </ShowcaseSection>

      {/* 2. Info Card */}
      <ShowcaseSection title="Info Card" description="Colored left border accent with icon, title, and checklist items.">
        <div className="grid grid-cols-2 gap-3">
          <InfoCardBlock
            icon={Server}
            title="Frontend Layer"
            color="#5E81AC"
            items={["React 19 + TypeScript", "Vite dev server", "Tailwind CSS v4", "shadcn/ui components"]}
          />
          <InfoCardBlock
            icon={Database}
            title="Backend Layer"
            color="#B48EAD"
            items={["Express REST API", "SQLite with WAL mode", "Auto-login auth", "JSON column support"]}
          />
        </div>
      </ShowcaseSection>

      {/* 3. Stat Card */}
      <ShowcaseSection title="Stat Card" description="Big number display with colored top border. Great for metrics and KPIs.">
        <div className="grid grid-cols-4 gap-3">
          <StatCardBlock value="1,247" label="Total Contacts" description="Active in CRM" color="#5E81AC" />
          <StatCardBlock value="$14.2k" label="Revenue" description="This month" color="#A3BE8C" />
          <StatCardBlock value="98.5%" label="Uptime" description="Last 30 days" color="#B48EAD" />
          <StatCardBlock value="23ms" label="Avg Response" description="API latency" color="#D08770" />
        </div>
      </ShowcaseSection>

      {/* 4. Step Flow */}
      <ShowcaseSection title="Step Flow" description="Numbered sequential steps with connecting line. For processes and workflows.">
        <StepFlowBlock
          steps={[
            { label: "User sends request", description: "HTTP request hits the Express server on port 3001", color: "#5E81AC" },
            { label: "Server validates input", description: "Auth check, parameter validation, rate limiting", color: "#B48EAD" },
            { label: "Query SQLite database", description: "better-sqlite3 runs the query with WAL mode", color: "#A3BE8C" },
            { label: "Return JSON response", description: "Formatted response with pagination metadata", color: "#D08770" },
          ]}
        />
      </ShowcaseSection>

      {/* 5. Callout */}
      <ShowcaseSection title="Callout" description="Highlighted message blocks in four variants.">
        <div className="space-y-3">
          <CalloutBlock variant="info" text="The SQLite database is stored at /data/crm.db with WAL journaling enabled for concurrent reads." />
          <CalloutBlock variant="success" text="All CRUD operations tested and passing. TypeScript compilation clean with zero errors." />
          <CalloutBlock variant="warning" text="The Express server must be running before starting the Vite dev server for API proxying to work." />
          <CalloutBlock variant="quote" text="Simplicity is the ultimate sophistication. Build only what you need, when you need it." />
        </div>
      </ShowcaseSection>

      {/* 6. Code Block */}
      <ShowcaseSection title="Code Block" description="Syntax-highlighted code display with language label.">
        <CodeBlockBlock
          language="typescript"
          code={`const blockComponents = {
  heading:    SectionHeaderBlock,
  infoCard:   InfoCardBlock,
  statCard:   StatCardBlock,
  stepFlow:   StepFlowBlock,
  callout:    CalloutBlock,
};

const BlockRenderer = ({ blocks }) => (
  <>
    {blocks.map((block, i) => {
      const Component = blockComponents[block._type];
      return Component ? <Component key={i} {...block} /> : null;
    })}
  </>
);`}
        />
      </ShowcaseSection>

      {/* 7. List Row */}
      <ShowcaseSection title="List Row" description="Status-aware list items with label and value. Compact data display.">
        <ListRowBlock
          items={[
            { label: "Express API Server", value: "Port 3001", status: "online" },
            { label: "Vite Dev Server", value: "Port 3300", status: "online" },
            { label: "SQLite Database", value: "WAL mode", status: "online" },
            { label: "Supabase Connection", value: "Not configured", status: "offline" },
            { label: "Background Jobs", value: "Idle", status: "warning" },
          ]}
        />
      </ShowcaseSection>

      {/* 8. Timeline */}
      <ShowcaseSection title="Timeline" description="Vertical chronological entries with colored dots. For history and activity logs.">
        <TimelineBlock
          entries={[
            { date: "Feb 22, 2026", title: "SQLite provider built and tested", description: "Full CRM data provider with 8 tables, 3 views, 10 filter operators", color: "#A3BE8C" },
            { date: "Feb 22, 2026", title: "Feature flags and auto-login complete", description: "ConfigurationContext with granular feature toggling", color: "#5E81AC" },
            { date: "Feb 21, 2026", title: "Architecture decided", description: "Atomic CRM + SQLite + block-based knowledge base", color: "#B48EAD" },
            { date: "Feb 19, 2026", title: "User analysis complete", description: "All 22 users analyzed across 10 machine types", color: "#D08770" },
          ]}
        />
      </ShowcaseSection>

      {/* 9. Card Grid */}
      <ShowcaseSection title="Card Grid" description="Navigation cards with icons. For indexes and directories.">
        <CardGridBlock
          items={[
            { icon: Server, title: "System Overview", description: "Architecture and service boundaries", color: "#5E81AC" },
            { icon: Code2, title: "Technology Stack", description: "Frontend, backend, and infrastructure", color: "#B48EAD" },
            { icon: Database, title: "Data Model", description: "Tables, views, and relationships", color: "#A3BE8C" },
            { icon: Globe, title: "API Reference", description: "REST endpoints and authentication", color: "#D08770" },
            { icon: Zap, title: "Performance", description: "Metrics, targets, and optimization", color: "#BF616A" },
            { icon: GitBranch, title: "Deployment", description: "CI/CD pipeline and environments", color: "#B48EAD" },
          ]}
        />
      </ShowcaseSection>

      {/* 10. Progress Bar */}
      <ShowcaseSection title="Progress Bar" description="Horizontal fill bar for completion tracking.">
        <div className="space-y-4">
          <ProgressBarBlock value={95} label="Phase 1 — Foundation" color="#A3BE8C" />
          <ProgressBarBlock value={60} label="Phase 2 — Knowledge Base" color="#5E81AC" />
          <ProgressBarBlock value={15} label="Phase 3 — Plugin System" color="#B48EAD" />
        </div>
      </ShowcaseSection>

      {/* 11. Tag List */}
      <ShowcaseSection title="Tag List" description="Colored pill badges for categories and labels.">
        <TagListBlock
          tags={[
            { label: "React", color: "#5E81AC" },
            { label: "TypeScript", color: "#B48EAD" },
            { label: "SQLite", color: "#A3BE8C" },
            { label: "Tailwind", color: "#88C0D0" },
            { label: "Express", color: "#D08770" },
            { label: "Vite", color: "#B48EAD" },
            { label: "shadcn/ui", color: "#BF616A" },
          ]}
        />
      </ShowcaseSection>

      {/* 12. Data Table */}
      <ShowcaseSection title="Data Table" description="Structured tabular data with headers and rows." flush>
        <DataTableBlock
          headers={["Service", "Port", "Status", "Technology"]}
          rows={[
            ["Frontend", "3300", "Running", "Vite + React"],
            ["API Server", "3001", "Running", "Express + SQLite"],
            ["Database", "—", "Active", "better-sqlite3 (WAL)"],
            ["Auth", "—", "Auto-login", "Single user mode"],
          ]}
        />
      </ShowcaseSection>

      {/* 13. Expandable Section */}
      <ShowcaseSection title="Expandable Section" description="Click to reveal/hide content. For FAQs and optional detail.">
        <div className="space-y-2">
          <ExpandableSectionBlock title="How does the block renderer work?" defaultOpen>
            <p className="text-sm text-muted-foreground">
              The renderer walks a JSON array of typed blocks. For each block, it looks up the component
              in the registry by type, passes the block data as props, and renders it. Layout blocks
              like Grid and Tabs can contain child block arrays, making the renderer recursive.
            </p>
          </ExpandableSectionBlock>
          <ExpandableSectionBlock title="Can I create custom block types?">
            <p className="text-sm text-muted-foreground">
              Yes. Create a React component, register it in the block registry with a type key,
              and it becomes available for use in any JSON block array.
            </p>
          </ExpandableSectionBlock>
        </div>
      </ShowcaseSection>

      {/* 14. Comparison Panel */}
      <ShowcaseSection title="Comparison Panel" description="Side-by-side comparison of two options or states.">
        <ComparisonBlock
          left={{
            title: "Current State",
            color: "#BF616A",
            items: [
              "Markdown only — no interactivity",
              "Hardcoded pages — no database",
              "Inconsistent component styles",
              "No reuse across pages",
            ],
          }}
          right={{
            title: "Target State",
            color: "#A3BE8C",
            items: [
              "Block-based — rich React components",
              "JSON in database — fully dynamic",
              "15 consistent block types",
              "Compose any page from blocks",
            ],
          }}
        />
      </ShowcaseSection>

      {/* 15. Paragraph (styled text) */}
      <ShowcaseSection title="Paragraph" description="Styled body text with optional emphasis. The bread and butter.">
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            The block library provides a consistent set of composable UI elements for building
            knowledge base pages. Each block accepts structured data as props and renders
            a predictable, well-styled output.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Blocks can be combined freely — a page might start with a <strong className="text-foreground">Section Header</strong>,
            followed by a <strong className="text-foreground">Callout</strong>, then a two-column <strong className="text-foreground">Grid</strong> of
            <strong className="text-foreground"> Info Cards</strong>, and finish with a <strong className="text-foreground">Timeline</strong>.
            The same fifteen blocks create infinite variety through composition.
          </p>
        </div>
      </ShowcaseSection>

      <Separator />

      {/* Summary */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          15 blocks · JSON-drivable · Light + dark mode · Composable
        </p>
      </div>
    </div>
  );
};

BlockLibraryPage.path = "/block-library";

// ─── Helper: Showcase wrapper ───
function ShowcaseSection({
  title,
  description,
  children,
  flush = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className={`bg-card border border-border rounded-xl overflow-hidden ${flush ? "" : "p-5"}`}>{children}</div>
    </div>
  );
}
