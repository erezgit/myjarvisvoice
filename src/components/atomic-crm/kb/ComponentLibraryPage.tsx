import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ListChecks,
  HelpCircle,
  MessageSquare,
  TrendingUp,
  DollarSign,
  UserPlus,
  Clock,
  ChevronDown,
  BookOpen,
  Layers,
  FileText,
  Table2,
  CheckSquare,
  BarChart3,
  Mic,
  ArrowRight,
  Database,
  Code,
  Component,
} from "lucide-react";

// ============================================================
// Color constants
// ============================================================
const VIOLET = "#a78bfa";
const ATTENDEE_COLORS: Record<string, string> = {
  Erez: "#a78bfa",
  Yaron: "#60a5fa",
  Dvir: "#34d399",
  Tom: "#fbbf24",
};

// ============================================================
// Reusable Section wrapper (same as MeetingDetailPage)
// ============================================================
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: typeof CheckCircle2;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 -mt-1">{children}</div>}
    </div>
  );
}

// ============================================================
// SECTION COMPONENTS — Rendered with sample data
// ============================================================

function DecisionsSample() {
  const data = [
    { title: "Use Fly.io for hosting", description: "Better DX, cheaper for our scale, easy machine management", status: "agreed" },
    { title: "Component registry pattern", description: "Pages composed via JSON sections, agent picks components", status: "agreed" },
    { title: "Pricing model — $19/mo", description: "Needs more market research before finalizing", status: "directional" },
  ];
  return (
    <Section title={`Key Decisions (${data.length})`} icon={CheckCircle2}>
      <div className="space-y-3">
        {data.map((d, i) => {
          const isAgreed = d.status === "agreed";
          return (
            <div key={i} className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isAgreed ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {isAgreed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {isAgreed ? "Agreed" : "Directional"}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground ml-0.5">{d.description}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ActionItemsSample() {
  const data = [
    { category: "Technical", items: ["Implement component registry", "Extract sections from MeetingDetailPage", "Add markdown renderer"] },
    { category: "Business", items: ["Prepare demo for Tom & Devir", "Draft pricing page"] },
  ];
  return (
    <Section title="Action Items" icon={ListChecks}>
      <div className="space-y-4">
        {data.map((group, gi) => (
          <div key={gi}>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 mb-2">
              {group.category}
            </span>
            <div className="space-y-1.5 ml-1">
              {group.items.map((item, ii) => (
                <div key={ii} className="flex items-start gap-2.5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TimelineSample() {
  const data = [
    { time: "10:00", section: "Introduction", topic: "Reviewed Q4 results and set agenda" },
    { time: "10:30", section: "Strategy", topic: "Discussed go-to-market approach for SMB segment" },
    { time: "11:00", section: "Technical", topic: "Component registry architecture deep dive" },
    { time: "11:45", section: "Wrap-up", topic: "Assigned action items and next meeting date" },
  ];
  return (
    <Section title="Meeting Flow" icon={Clock}>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-border last:border-0">
            <span className="text-violet-400 font-mono text-xs w-24 shrink-0 pt-0.5">
              {item.time}
            </span>
            <span className="text-sm text-muted-foreground">{item.topic}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function DebatesSample() {
  const data = [
    {
      title: "Pricing model",
      status: "unresolved",
      positions: { erez: "Freemium with $19/mo pro tier", tom: "Flat $29/mo, no free tier", dvir: "Usage-based pricing" },
    },
    {
      title: "Target market",
      status: "resolved",
      positions: { erez: "Start with SMBs (5-50 people)", yaron: "Focus on agencies first" },
      decision: "Start with SMBs, agencies as second wave",
    },
  ];
  return (
    <Section title="Key Debates" icon={TrendingUp}>
      <div className="space-y-3">
        {data.map((debate, i) => (
          <div key={i} className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">{debate.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${debate.status === "resolved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {debate.status}
              </span>
            </div>
            <div className="space-y-1.5 ml-1">
              {Object.entries(debate.positions).map(([name, position]) => {
                const color = ATTENDEE_COLORS[name.charAt(0).toUpperCase() + name.slice(1)] ?? "#a1a1aa";
                return (
                  <div key={name} className="flex items-start gap-2 text-xs">
                    <span className="font-medium shrink-0" style={{ color }}>{name.charAt(0).toUpperCase() + name.slice(1)}:</span>
                    <span className="text-muted-foreground">{position}</span>
                  </div>
                );
              })}
            </div>
            {debate.decision && (
              <p className="text-xs text-emerald-500 mt-2 font-medium">→ {debate.decision}</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function DeepDivesSample() {
  const data = [
    { title: "Infrastructure costs", points: ["Current: $120/mo on Fly.io", "Projected: $400/mo at 50 users", "Main cost driver: machine hours per user"] },
    { title: "Agent reliability", points: ["Heartbeat keeps agents alive", "Budget caps prevent runaway costs", "Need monitoring dashboard"] },
  ];
  return (
    <Section title="Deep Dives" icon={MessageSquare}>
      <div className="space-y-4">
        {data.map((dive, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer text-sm font-semibold text-foreground hover:text-violet-400 transition-colors list-none">
              <span className="text-violet-400 mr-2">▸</span>
              {dive.title}
            </summary>
            <div className="mt-2 ml-5 space-y-1.5">
              {dive.points.map((pt, pi) => (
                <div key={pi} className="flex items-start gap-2.5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50 mt-2 shrink-0" />
                  <span className="text-muted-foreground">{pt}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}

function ContactsSample() {
  const data = [
    { name: "David Cohen", status: "warm lead", description: "CEO of TechCo, interested in enterprise plan" },
    { name: "Sarah Miller", status: "partner", description: "Runs design agency, wants white-label solution" },
  ];
  return (
    <Section title="Contacts & Leads" icon={UserPlus}>
      <div className="space-y-3">
        {data.map((contact, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">{contact.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{contact.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">{contact.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function KeyValueSample() {
  const data = {
    title: "Financial Model",
    groups: {
      revenue: { "Monthly revenue": "$2,400", "Annual run rate": "$28,800", "Avg revenue per user": "$51" },
      costs: { "Infrastructure": "$120/mo", "API costs": "$80/mo", "Burn rate": "$1,800/mo" },
    },
  };
  return (
    <Section title="Financial Model" icon={DollarSign}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data.groups).map(([key, pairs]) => (
          <div key={key} className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 capitalize">{key}</h3>
            <div className="space-y-1.5">
              {Object.entries(pairs).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function OpenQuestionsSample() {
  const data = [
    { title: "How do we handle multi-tenancy?", description: "Each company gets isolated Supabase or shared with RLS?" },
    { title: "Agent cost attribution", description: "How do we track and bill per-company agent usage?" },
  ];
  return (
    <Section title={`Open Questions (${data.length})`} icon={HelpCircle}>
      <div className="space-y-3">
        {data.map((q, i) => (
          <div key={i} className="rounded-lg border p-4 bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground mb-1">{q.title}</h3>
            <p className="text-xs text-muted-foreground">{q.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function MarkdownSample() {
  return (
    <Section title="Market Analysis" icon={FileText}>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <h3 className="text-base font-semibold text-foreground mt-0">Overview</h3>
        <p className="text-sm text-muted-foreground">
          After reviewing 12 competitors in the business OS space, we identified three key gaps
          that MyJarvis OS can fill. The agent-driven automation layer is unique — no competitor
          offers Claude Code-powered agents that run inside the OS.
        </p>
        <h4 className="text-sm font-semibold text-foreground">Competitor Pricing</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Monday.com</strong> — $12/seat/mo (Work OS, no AI agents)</li>
          <li><strong className="text-foreground">Notion</strong> — $10/seat/mo (Knowledge, no automation)</li>
          <li><strong className="text-foreground">ClickUp</strong> — $7/seat/mo (Task management focused)</li>
        </ul>
        <h4 className="text-sm font-semibold text-foreground">Recommendation</h4>
        <p className="text-sm text-muted-foreground">
          Position at <strong className="text-foreground">$19/mo</strong> — premium to reflect the AI agent
          capability. The automation layer justifies 2x pricing over pure SaaS competitors.
        </p>
      </div>
    </Section>
  );
}

function TableSample() {
  const headers = ["Feature", "MyJarvis OS", "Monday.com", "Notion"];
  const rows = [
    ["AI Agents", "✅ Claude Code", "❌", "❌"],
    ["CRM", "✅", "✅", "❌"],
    ["Knowledge Base", "✅ + Agent", "✅", "✅"],
    ["Automations", "✅ Claude Code", "✅ Basic", "❌"],
    ["Price", "$19/mo", "$12/seat/mo", "$10/seat/mo"],
  ];
  return (
    <Section title="Feature Comparison" icon={Table2}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {headers.map((h) => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className={`py-2.5 px-3 text-xs ${j === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ChecklistSample() {
  const data = [
    { text: "Implement component registry", checked: true, owner: "Erez", due: "Mar 10" },
    { text: "Extract sections from MeetingDetailPage", checked: false, owner: "Erez", due: "Mar 11" },
    { text: "Add markdown renderer", checked: false, owner: "Yaron", due: "Mar 12" },
    { text: "Prepare partner demo", checked: false, owner: "Tom", due: "Mar 9" },
  ];
  return (
    <Section title="Sprint Checklist" icon={CheckSquare}>
      <div className="space-y-2">
        {data.map((item, i) => {
          const color = ATTENDEE_COLORS[item.owner] ?? "#a1a1aa";
          return (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${item.checked ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"}`}>
                {item.checked && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground/50" : "text-foreground"}`}>{item.text}</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${color}30`, color }}>
                  {item.owner[0]}
                </div>
                <span className="text-[10px] text-muted-foreground">{item.due}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function KpiCardsSample() {
  const data = [
    { label: "Active Users", value: "47", trend: "+12%", direction: "up" },
    { label: "Monthly Revenue", value: "$2,400", trend: "+8%", direction: "up" },
    { label: "Agent Runs", value: "234", trend: "+45%", direction: "up" },
    { label: "Avg Cost/Run", value: "$0.42", trend: "-15%", direction: "down" },
  ];
  return (
    <Section title="Key Metrics" icon={BarChart3}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.map((kpi, i) => (
          <div key={i} className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            <div className={`text-xs font-medium mt-1 ${kpi.direction === "up" ? "text-emerald-500" : "text-red-500"}`}>
              {kpi.direction === "up" ? "↑" : "↓"} {kpi.trend}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TranscriptSample() {
  const data = [
    { speaker: "Erez", timestamp: "00:02:15", text: "So the main question is how do we structure the OS for different companies..." },
    { speaker: "Tom", timestamp: "00:03:42", text: "I think we need to start with a clear template that covers the basics — CRM, tasks, knowledge base." },
    { speaker: "Dvir", timestamp: "00:04:18", text: "What about the agent layer? That's really what differentiates us from Monday or Notion." },
    { speaker: "Yaron", timestamp: "00:05:01", text: "The component registry pattern solves the dynamic page problem elegantly." },
  ];
  return (
    <Section title="Transcript" icon={Mic}>
      <div className="space-y-3">
        {data.map((seg, i) => {
          const color = ATTENDEE_COLORS[seg.speaker] ?? "#a1a1aa";
          return (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 pt-0.5 w-28 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${color}30`, color }}>
                  {seg.speaker[0]}
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color }}>{seg.speaker}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{seg.timestamp}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{seg.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ============================================================
// Section catalog for the Library tab
// ============================================================
const CATALOG = [
  { id: "decisions", label: "Decisions", icon: CheckCircle2, component: DecisionsSample, category: "Meetings", status: "extract" as const },
  { id: "action_items", label: "Action Items", icon: ListChecks, component: ActionItemsSample, category: "Meetings", status: "extract" as const },
  { id: "timeline", label: "Timeline", icon: Clock, component: TimelineSample, category: "Meetings", status: "extract" as const },
  { id: "debates", label: "Debates", icon: TrendingUp, component: DebatesSample, category: "Meetings", status: "extract" as const },
  { id: "deep_dives", label: "Deep Dives", icon: MessageSquare, component: DeepDivesSample, category: "Meetings", status: "extract" as const },
  { id: "open_questions", label: "Open Questions", icon: HelpCircle, component: OpenQuestionsSample, category: "Meetings", status: "extract" as const },
  { id: "contacts", label: "Contacts", icon: UserPlus, component: ContactsSample, category: "Meetings", status: "extract" as const },
  { id: "key_value", label: "Key-Value Grid", icon: DollarSign, component: KeyValueSample, category: "Data", status: "extract" as const },
  { id: "markdown", label: "Markdown", icon: FileText, component: MarkdownSample, category: "Content", status: "new" as const },
  { id: "table", label: "Table", icon: Table2, component: TableSample, category: "Data", status: "new" as const },
  { id: "checklist", label: "Checklist", icon: CheckSquare, component: ChecklistSample, category: "Tasks", status: "new" as const },
  { id: "kpi_cards", label: "KPI Cards", icon: BarChart3, component: KpiCardsSample, category: "Data", status: "new" as const },
  { id: "transcript", label: "Transcript", icon: Mic, component: TranscriptSample, category: "Meetings", status: "new" as const },
];

const CATEGORIES = ["All", "Meetings", "Content", "Data", "Tasks"] as const;

// ============================================================
// TAB: How It Works
// ============================================================
function HowItWorksTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Overview */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Component className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-foreground">Component Registry</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every page in the OS is composed from <strong className="text-foreground">sections</strong>.
          Each section has a <code className="px-1.5 py-0.5 rounded bg-muted text-xs">type</code> that
          maps to a React component, a <code className="px-1.5 py-0.5 rounded bg-muted text-xs">title</code>,
          and a <code className="px-1.5 py-0.5 rounded bg-muted text-xs">data</code> object.
          The agent writes JSON. The frontend renders it.
        </p>
      </div>

      {/* 3-step flow */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">1</div>
            <span className="text-sm font-semibold text-foreground">Agent writes JSON</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The agent inserts a row into the database with a <code className="px-1 py-0.5 rounded bg-muted text-[10px]">sections</code> array.
          </p>
          <pre className="text-[11px] bg-muted/50 rounded-lg p-3 text-muted-foreground overflow-x-auto whitespace-pre-wrap">{`{
  "sections": [
    {
      "type": "decisions",
      "title": "Key Decisions",
      "data": [...]
    },
    {
      "type": "markdown",
      "title": "Analysis",
      "data": { "content": "..." }
    }
  ]
}`}</pre>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">2</div>
            <span className="text-sm font-semibold text-foreground">Registry maps types</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A simple object maps each type string to its React component.
          </p>
          <pre className="text-[11px] bg-muted/50 rounded-lg p-3 text-muted-foreground overflow-x-auto whitespace-pre-wrap">{`const REGISTRY = {
  decisions:    DecisionsSection,
  action_items: ActionItemsSection,
  timeline:     TimelineSection,
  markdown:     MarkdownSection,
  table:        TableSection,
  checklist:    ChecklistSection,
  kpi_cards:    KpiCardsSection,
  transcript:   TranscriptSection,
};`}</pre>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">3</div>
            <span className="text-sm font-semibold text-foreground">Page renders loop</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The page loops through sections and renders each matched component.
          </p>
          <pre className="text-[11px] bg-muted/50 rounded-lg p-3 text-muted-foreground overflow-x-auto whitespace-pre-wrap">{`sections.map(section => {
  const Comp = REGISTRY[section.type];
  if (!Comp) return null;
  return (
    <Section title={section.title}>
      <Comp data={section.data} />
    </Section>
  );
});`}</pre>
        </div>
      </div>

      {/* Who controls what */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-foreground">Agent controls</span>
          </div>
          <div className="space-y-2">
            {["Which section types appear", "Section order on the page", "Section titles", "All data content", "How many sections per page"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" /> {t}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-foreground">We control (code releases)</span>
          </div>
          <div className="space-y-2">
            {["What component types exist", "How each component renders", "Styling and interactions", "Inline editing behavior", "Adding new types over time"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" /> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline editing note */}
      <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-foreground">Inline Editing</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every text field in every section component supports inline editing via
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs mx-1">EditableText</code>.
          Click any text to edit. Changes save to the database via
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs mx-1">updateField(&quot;sections.0.data.0.title&quot;, value)</code>.
          The agent writes the initial content. Humans refine it inline.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// TAB: Library
// ============================================================
function LibraryTab() {
  const [filter, setFilter] = useState<typeof CATEGORIES[number]>("All");

  const filtered = filter === "All" ? CATALOG : CATALOG.filter((c) => c.category === filter);

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === cat
                ? "bg-violet-500/15 text-violet-500 border border-violet-500/30"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Component count */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} component{filtered.length !== 1 ? "s" : ""}
        {filter !== "All" && ` in ${filter}`}
      </div>

      {/* Rendered components */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const Comp = item.component;
          return (
            <div key={item.id}>
              {/* Type label */}
              <div className="flex items-center gap-2 mb-2">
                <code className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{item.id}</code>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  item.status === "extract"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {item.status === "extract" ? "In code" : "New"}
                </span>
                <span className="text-[10px] text-muted-foreground">{item.category}</span>
              </div>
              {/* The actual component */}
              <Comp />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
type TabId = "how-it-works" | "library";

export function ComponentLibraryPage() {
  const [tab, setTab] = useState<TabId>("library");

  return (
    <div className="px-6 pb-6 pt-0 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-5 h-5 text-violet-400" />
          <h1 className="text-2xl font-bold text-foreground">Component Library</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pre-built section components. The agent composes pages by referencing these types in JSON.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/40 w-fit">
        {[
          { id: "how-it-works" as TabId, label: "How It Works", icon: BookOpen },
          { id: "library" as TabId, label: "Library", icon: Layers },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "how-it-works" && <HowItWorksTab />}
      {tab === "library" && <LibraryTab />}
    </div>
  );
}

ComponentLibraryPage.path = "/component-library";
