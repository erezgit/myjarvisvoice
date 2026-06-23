import { useState, useCallback, useMemo, useRef } from "react";
import { useGetList } from "ra-core";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Ticket,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Send,
  XCircle,
  Archive,
  List,
  Columns3,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import type { RaRecord } from "ra-core";

// ─── Types ──────────────────────────────────────────────────────────────────

type QAStatus = "draft" | "validated" | "published" | "rejected" | "done";
type Classification = "public" | "internal" | "restricted";

type QAEntry = {
  question: string;
  answer: string;
  customer: string;
  status: QAStatus;
  sources: string | string[];
  classification: Classification;
  confidence: number;
  rating: number;
  feedback: string;
  category: string;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<QAStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft:     { label: "Draft",     color: "#9ca3af", bg: "#9ca3af15", icon: Clock },
  validated: { label: "Validated", color: "#10b981", bg: "#10b98115", icon: CheckCircle2 },
  published: { label: "Sent",     color: "#3b82f6", bg: "#3b82f615", icon: Send },
  rejected:  { label: "Rejected", color: "#ef4444", bg: "#ef444415", icon: XCircle },
  done:      { label: "Done",     color: "#6b7280", bg: "#6b728015", icon: Archive },
};

const CLASSIFICATION_CONFIG: Record<Classification, { label: string; color: string; icon: typeof Shield }> = {
  public:     { label: "Public",     color: "#10b981", icon: ShieldCheck },
  internal:   { label: "Internal",   color: "#f59e0b", icon: Shield },
  restricted: { label: "Restricted", color: "#ef4444", icon: ShieldAlert },
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

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Rich Answer Renderer ────────────────────────────────────────────────

function RichAnswer({ text }: { text: string }) {
  const blocks = useMemo(() => parseAnswerBlocks(text), [text]);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={i}
              className="text-[13px] font-bold text-foreground/90 tracking-wide uppercase pt-2 first:pt-0"
            >
              {block.content}
            </h3>
          );
        }
        if (block.type === "subheading") {
          return (
            <h4 key={i} className="text-sm font-semibold text-foreground/80 pt-1">
              {block.content}
            </h4>
          );
        }
        if (block.type === "code") {
          return (
            <pre
              key={i}
              className="rounded-lg bg-muted/60 border border-border/50 px-4 py-3 text-[12px] leading-relaxed font-mono text-foreground/85 overflow-x-auto"
            >
              {block.content}
            </pre>
          );
        }
        if (block.type === "meta") {
          const parts = block.content.split("\n").filter(Boolean);
          return (
            <div key={i} className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
              {parts.map((p, j) => {
                const [label, value] = p.split(/:\s*(.+)/);
                if (!value) return null;
                const isConfidence = label.toLowerCase().includes("confidence");
                const isClassification = label.toLowerCase().includes("classification");
                return (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{
                      backgroundColor: isConfidence
                        ? "#3b82f615"
                        : isClassification
                          ? "#10b98115"
                          : "#6b728015",
                      color: isConfidence
                        ? "#3b82f6"
                        : isClassification
                          ? "#10b981"
                          : "#6b7280",
                    }}
                  >
                    {label}: {value}
                  </span>
                );
              })}
            </div>
          );
        }
        // paragraph — handle bullets and plain text
        return (
          <div key={i} className="text-sm text-muted-foreground leading-relaxed">
            {block.content.split("\n").map((line, j) => {
              const trimmed = line.trimStart();
              if (trimmed.startsWith("- ")) {
                return (
                  <div key={j} className="flex items-start gap-2 py-0.5">
                    <span className="text-muted-foreground/40 mt-1.5 text-[8px]">●</span>
                    <span>{trimmed.slice(2)}</span>
                  </div>
                );
              }
              if (/^\d+\.\s/.test(trimmed)) {
                const num = trimmed.match(/^(\d+)\.\s/)?.[1];
                return (
                  <div key={j} className="flex items-start gap-2 py-0.5">
                    <span className="text-muted-foreground/50 text-xs font-medium min-w-[16px]">{num}.</span>
                    <span>{trimmed.replace(/^\d+\.\s/, "")}</span>
                  </div>
                );
              }
              if (line.trim() === "") return <div key={j} className="h-1.5" />;
              // Sub-label lines like "Synchronization:" or "Data Transfer:"
              if (/^[A-Z][A-Za-z\s/()-]+:$/.test(trimmed)) {
                return (
                  <p key={j} className="text-sm font-semibold text-foreground/75 pt-1.5">
                    {trimmed}
                  </p>
                );
              }
              return <p key={j}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

type AnswerBlock = {
  type: "heading" | "subheading" | "code" | "paragraph" | "meta";
  content: string;
};

function parseAnswerBlocks(text: string): AnswerBlock[] {
  const lines = text.split("\n");
  const blocks: AnswerBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines between blocks
    if (trimmed === "") {
      i++;
      continue;
    }

    // CLASSIFICATION / CONFIDENCE meta line(s) at end
    if (/^(CLASSIFICATION|CONFIDENCE):/i.test(trimmed)) {
      const metaLines: string[] = [];
      while (i < lines.length) {
        const ml = lines[i].trim();
        if (ml === "") { i++; continue; }
        if (/^(CLASSIFICATION|CONFIDENCE):/i.test(ml)) {
          metaLines.push(ml);
          i++;
        } else {
          break;
        }
      }
      if (metaLines.length > 0) {
        blocks.push({ type: "meta", content: metaLines.join("\n") });
      }
      continue;
    }

    // ALL-CAPS heading (with optional " — subtitle")
    if (/^[A-Z][A-Z\s\-—&/]+(\s—\s.+)?$/.test(trimmed) && trimmed.length > 2) {
      const dashIdx = trimmed.indexOf(" — ");
      if (dashIdx > 0) {
        blocks.push({ type: "heading", content: trimmed.slice(0, dashIdx) });
        blocks.push({ type: "subheading", content: trimmed.slice(dashIdx + 3) });
      } else {
        blocks.push({ type: "heading", content: trimmed });
      }
      i++;
      continue;
    }

    // Code block detection: lines starting with spaces (indented code) or common code patterns
    if (
      /^( {2,}|\t)/.test(line) ||
      /^(with |from |import |def |class |for |while |if |#|assign\(|play\(|measure\(|align\()/.test(trimmed)
    ) {
      const codeLines: string[] = [];
      while (i < lines.length) {
        const cl = lines[i];
        const ct = cl.trim();
        // Continue code block if indented, blank (within code), or code-like
        if (
          /^( {2,}|\t)/.test(cl) ||
          ct === "" ||
          /^(with |from |import |def |class |for |while |if |elif |else:|#|assign\(|play\(|measure\(|align\(|declare\(|save\()/.test(ct) ||
          /^[a-z_]+ = /.test(ct) ||
          /^\.\.\.$/.test(ct)
        ) {
          codeLines.push(cl);
          i++;
          // If we hit 2+ empty lines in a row, break out
          if (ct === "" && i < lines.length && lines[i].trim() === "" && i + 1 < lines.length && /^[A-Z]/.test(lines[i + 1].trim())) {
            break;
          }
        } else {
          break;
        }
      }
      // Trim trailing empty lines
      while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === "") {
        codeLines.pop();
      }
      if (codeLines.length > 0) {
        // Find minimum indentation to dedent
        const nonEmpty = codeLines.filter((l) => l.trim() !== "");
        const minIndent = nonEmpty.reduce((min, l) => {
          const spaces = l.match(/^(\s*)/)?.[1].length ?? 0;
          return Math.min(min, spaces);
        }, Infinity);
        const dedented = codeLines.map((l) =>
          l.trim() === "" ? "" : l.slice(minIndent === Infinity ? 0 : minIndent)
        );
        blocks.push({ type: "code", content: dedented.join("\n") });
      }
      continue;
    }

    // Regular paragraph — collect lines until next heading, code, or meta
    const paraLines: string[] = [];
    while (i < lines.length) {
      const pl = lines[i];
      const pt = pl.trim();
      // Stop at next heading
      if (/^[A-Z][A-Z\s\-—&/]+(\s—\s.+)?$/.test(pt) && pt.length > 2) break;
      // Stop at meta
      if (/^(CLASSIFICATION|CONFIDENCE):/i.test(pt)) break;
      // Stop at code
      if (/^(with |from |import |def |class )/.test(pt) && !pt.endsWith(":") && pt.length > 30) break;
      if (/^( {4,}|\t{2,})/.test(pl) && /[()=]/.test(pt)) break;
      paraLines.push(pl);
      i++;
    }
    // Trim
    while (paraLines.length > 0 && paraLines[paraLines.length - 1].trim() === "") paraLines.pop();
    while (paraLines.length > 0 && paraLines[0].trim() === "") paraLines.shift();
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ─── API Helpers ────────────────────────────────────────────────────────────

const API = "http://localhost:3001";

async function createTicket(data: Partial<QAEntry>): Promise<QAEntry> {
  const res = await fetch(`${API}/api/qa_entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function updateTicket(id: number | string, data: Partial<QAEntry>): Promise<QAEntry> {
  const res = await fetch(`${API}/api/qa_entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteTicket(id: number | string): Promise<void> {
  await fetch(`${API}/api/qa_entries/${id}`, { method: "DELETE" });
}

// ─── New Ticket Dialog ──────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "", label: "Select category..." },
  { value: "hardware_specs", label: "Hardware Specs" },
  { value: "code_examples", label: "Code Examples" },
  { value: "system_config", label: "System Config" },
  { value: "fpga_waveform", label: "FPGA / Waveform" },
  { value: "multi_chassis", label: "Multi-Chassis" },
  { value: "software_integration", label: "Software Integration" },
  { value: "general", label: "General" },
];

function NewTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [customer, setCustomer] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setSaving(true);
    await createTicket({
      question: question.trim(),
      customer: customer.trim(),
      category,
      status: "draft",
      classification: "public",
      confidence: 0,
    });
    setSaving(false);
    setQuestion("");
    setCustomer("");
    setCategory("");
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-2xl border shadow-xl w-full max-w-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">New Ticket</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What does the customer need to know?"
              className="w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Customer
              </label>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Company or contact name"
                className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || saving}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
          >
            {saving ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Downloads ──────────────────────────────────────────────────────────────

import { DownloadButton } from "../shared/DownloadButton";

function ticketToMarkdown(ticket: QAEntry): string {
  const lines: string[] = [];
  const id = `QM-${String(ticket.id).padStart(3, "0")}`;
  lines.push(`# ${id}\n`);
  lines.push(`## ${ticket.question}\n`);
  if (ticket.customer) lines.push(`**Customer:** ${ticket.customer}`);
  lines.push(`**Status:** ${ticket.status}`);
  lines.push(`**Classification:** ${ticket.classification}`);
  lines.push(`**Confidence:** ${ticket.confidence}/10`);
  if (ticket.category) lines.push(`**Category:** ${formatCategory(ticket.category)}`);
  lines.push("");
  if (ticket.answer) {
    lines.push("---\n");
    lines.push(ticket.answer);
    lines.push("");
  }
  const sources = Array.isArray(ticket.sources) ? ticket.sources : [];
  if (sources.length > 0) {
    lines.push("---\n");
    lines.push("## Sources\n");
    sources.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }
  if (ticket.feedback) {
    lines.push("---\n");
    lines.push("## Feedback\n");
    lines.push(ticket.feedback);
  }
  return lines.join("\n");
}

// ─── Ticket Detail View ─────────────────────────────────────────────────────

function TicketDetail({
  ticket,
  onBack,
  onRefresh,
}: {
  ticket: QAEntry;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.draft;
  const classCfg = CLASSIFICATION_CONFIG[ticket.classification] ?? CLASSIFICATION_CONFIG.public;
  const sources = Array.isArray(ticket.sources) ? ticket.sources : [];
  const ticketFilename = `QM-${String(ticket.id).padStart(3, "0")}`;
  const markdown = ticketToMarkdown(ticket);

  const handleStatusChange = async (newStatus: QAStatus) => {
    await updateTicket(ticket.id, { status: newStatus });
    onRefresh();
  };

  const handleClassificationChange = async (newClass: Classification) => {
    await updateTicket(ticket.id, { classification: newClass });
    onRefresh();
  };

  const handleCopyAnswer = () => {
    if (!ticket.answer) return;
    navigator.clipboard.writeText(ticket.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await deleteTicket(ticket.id);
    onRefresh();
    onBack();
  };

  return (
    <div className="px-6 pt-0 pb-6 max-w-5xl space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> All Tickets
        </button>
        <div className="flex items-center gap-1">
          <DownloadButton
            contentRef={contentRef}
            filename={ticketFilename}
            markdownContent={markdown}
          />
          {confirmDelete ? (
            <>
              <span className="text-xs text-red-400 mr-2">Delete this ticket?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* PDF-capturable content */}
      <div ref={contentRef} className="space-y-6 bg-background p-6 rounded-xl">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge (static in PDF) */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
            >
              {statusCfg.label}
            </span>

            {/* Classification badge (static in PDF) */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ color: classCfg.color, backgroundColor: `${classCfg.color}15` }}
            >
              {classCfg.label}
            </span>

            {ticket.category && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  color: CATEGORY_COLORS[ticket.category] ?? "#6b7280",
                  backgroundColor: `${CATEGORY_COLORS[ticket.category] ?? "#6b7280"}15`,
                }}
              >
                {formatCategory(ticket.category)}
              </span>
            )}
          </div>
          <p className="text-sm font-mono text-muted-foreground mb-1">{`QM-${String(ticket.id).padStart(3, '0')}`}</p>
          <h1 className="text-xl font-bold text-foreground">{ticket.question}</h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {ticket.customer && <span>Customer: {ticket.customer}</span>}
            <span>{formatDate(ticket.created_at)}</span>
            <span>Confidence: {ticket.confidence}/10</span>
          </div>
        </div>

        {/* Answer */}
        {ticket.answer && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Answer</h2>
              <button
                onClick={handleCopyAnswer}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors print:hidden"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <RichAnswer text={ticket.answer} />
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Sources</h2>
            <ul className="space-y-1.5">
              {sources.map((src, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-xs text-muted-foreground/50 mt-0.5">{i + 1}.</span>
                  {src}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback */}
        {ticket.feedback && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Feedback</h2>
            <p className="text-sm text-muted-foreground">{ticket.feedback}</p>
          </div>
        )}
      </div>

      {/* Status/Classification selectors — outside PDF capture area */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Change:</span>
        <select
          value={ticket.status}
          onChange={(e) => handleStatusChange(e.target.value as QAStatus)}
          className="appearance-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
        >
          <option value="draft">Draft</option>
          <option value="validated">Validated</option>
          <option value="published">Sent</option>
          <option value="rejected">Rejected</option>
          <option value="done">Done</option>
        </select>
        <select
          value={ticket.classification}
          onChange={(e) => handleClassificationChange(e.target.value as Classification)}
          className="appearance-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          style={{ color: classCfg.color, backgroundColor: `${classCfg.color}15` }}
        >
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="restricted">Restricted</option>
        </select>
      </div>
    </div>
  );
}

// ─── View Toggle ────────────────────────────────────────────────────────────

type ViewMode = "list" | "board";

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted/50 p-0.5">
      {([
        { value: "list" as const, icon: List },
        { value: "board" as const, icon: Columns3 },
      ]).map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`p-1.5 rounded-md transition-all ${
            mode === value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

// ─── Kanban Board ───────────────────────────────────────────────────────────

const BOARD_COLUMNS: { status: QAStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "validated", label: "Validated" },
  { status: "published", label: "Sent" },
  { status: "rejected", label: "Rejected" },
];

function KanbanCard({
  entry,
  index,
  onSelect,
}: {
  entry: QAEntry;
  index: number;
  onSelect: (id: number) => void;
}) {
  const truncated =
    entry.question.length > 60
      ? entry.question.slice(0, 60) + "…"
      : entry.question;

  return (
    <Draggable draggableId={String(entry.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect(entry.id as number)}
          className={`w-full text-left rounded-xl border bg-card p-3.5 cursor-pointer space-y-2 transition-shadow ${
            snapshot.isDragging ? "shadow-lg ring-1 ring-ring/20" : "hover:bg-muted/30"
          }`}
          style={{
            ...provided.draggableProps.style,
            // Prevent animation when dropping — instant placement
            ...(snapshot.isDropAnimating ? { transition: "transform 0.15s ease" } : {}),
          }}
        >
          <p className="text-xs text-muted-foreground font-mono mb-0.5">{`QM-${String(entry.id).padStart(3, '0')}`}</p>
          <p className="text-xs text-foreground leading-snug">{truncated}</p>
          {entry.customer && (
            <p className="text-[10px] text-muted-foreground">{entry.customer}</p>
          )}
          {entry.category && (
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[9px] font-medium"
              style={{
                color: CATEGORY_COLORS[entry.category] ?? "#6b7280",
                backgroundColor: `${CATEGORY_COLORS[entry.category] ?? "#6b7280"}12`,
              }}
            >
              {formatCategory(entry.category)}
            </span>
          )}
        </div>
      )}
    </Draggable>
  );
}

function KanbanBoard({
  entries,
  onSelect,
  onStatusChange,
}: {
  entries: QAEntry[];
  onSelect: (id: number) => void;
  onStatusChange: (id: number | string, newStatus: QAStatus) => void;
}) {
  // Optimistic local state — so cards don't jump back on drop
  const [localOverrides, setLocalOverrides] = useState<Record<string, QAStatus>>({});
  const [archiveOpen, setArchiveOpen] = useState(() => {
    try { return localStorage.getItem("tickets-archive-open") === "true"; } catch { return false; }
  });

  const toggleArchive = useCallback(() => {
    setArchiveOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem("tickets-archive-open", String(next)); } catch {}
      return next;
    });
  }, []);

  const effectiveEntries = useMemo(
    () =>
      entries.map((e) =>
        localOverrides[String(e.id)]
          ? { ...e, status: localOverrides[String(e.id)] }
          : e
      ),
    [entries, localOverrides]
  );

  const activeColumns = BOARD_COLUMNS.filter(
    (col) =>
      col.status !== "rejected" || effectiveEntries.some((e) => e.status === "rejected")
  );

  const doneEntries = effectiveEntries.filter((e) => e.status === "done");

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as QAStatus;
    const entry = entries.find((e) => String(e.id) === draggableId);
    if (!entry || entry.status === newStatus) return;

    // Auto-expand archive when dropping into it
    if (newStatus === "done" && !archiveOpen) {
      setArchiveOpen(true);
      try { localStorage.setItem("tickets-archive-open", "true"); } catch {}
    }

    // Optimistic update — card stays in new column immediately
    setLocalOverrides((prev) => ({ ...prev, [draggableId]: newStatus }));

    // Persist to API
    onStatusChange(entry.id, newStatus);

    // Clear override after API has had time to propagate
    setTimeout(() => {
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[draggableId];
        return next;
      });
    }, 2000);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Main columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {activeColumns.map((col) => {
          const statusCfg = STATUS_CONFIG[col.status];
          const colEntries = effectiveEntries.filter((e) => e.status === col.status);
          return (
            <div key={col.status} className="flex-1 min-w-[200px] max-w-[280px]">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusCfg.color }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {col.label}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  {colEntries.length}
                </span>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={col.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[60px] rounded-xl p-1 transition-colors ${
                      snapshot.isDraggingOver ? "bg-muted/30" : ""
                    }`}
                  >
                    {colEntries.map((entry, index) => (
                      <KanbanCard
                        key={String(entry.id)}
                        entry={entry}
                        index={index}
                        onSelect={onSelect}
                      />
                    ))}
                    {provided.placeholder}

                    {colEntries.length === 0 && !snapshot.isDraggingOver && (
                      <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-center">
                        <p className="text-[10px] text-muted-foreground/40">
                          No tickets
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>

      {/* Done archive — collapsible section at bottom */}
      <div className="mt-4 border-t border-border/30 pt-3">
        {/* Header — click to expand/collapse */}
        <button
          onClick={toggleArchive}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/20 transition-colors"
        >
          <Archive className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-xs font-medium text-muted-foreground">Done</span>
          <span className="text-[10px] text-muted-foreground/40">{doneEntries.length}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground/40 ml-auto transition-transform ${
              archiveOpen ? "" : "-rotate-90"
            }`}
          />
        </button>

        {/* Droppable — same vertical list pattern as other columns */}
        <Droppable droppableId="done">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 min-h-[40px] rounded-xl p-1 mt-1 transition-colors ${
                snapshot.isDraggingOver ? "bg-muted/30" : ""
              }`}
            >
              {archiveOpen && doneEntries.map((entry, index) => (
                <KanbanCard
                  key={String(entry.id)}
                  entry={entry}
                  index={index}
                  onSelect={onSelect}
                />
              ))}
              {provided.placeholder}

              {!archiveOpen && doneEntries.length === 0 && !snapshot.isDraggingOver && (
                <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground/40">
                    Drag tickets here when done
                  </p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

// ─── List View ──────────────────────────────────────────────────────────────

function ListView({
  entries,
  onSelect,
}: {
  entries: QAEntry[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden divide-y">
      {entries.map((entry) => {
        const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.draft;
        const truncated =
          entry.question.length > 80
            ? entry.question.slice(0, 80) + "…"
            : entry.question;
        return (
          <button
            key={String(entry.id)}
            onClick={() => onSelect(entry.id as number)}
            className="flex items-center gap-4 px-5 py-3.5 w-full text-left hover:bg-muted/40 transition-colors"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: statusCfg.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-mono mb-0.5">{`QM-${String(entry.id).padStart(3, '0')}`}</p>
              <p className="text-sm text-foreground truncate">{truncated}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {entry.customer && (
                  <span className="text-xs text-muted-foreground">
                    {entry.customer}
                  </span>
                )}
                {entry.category && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: CATEGORY_COLORS[entry.category] ?? "#6b7280",
                      backgroundColor: `${CATEGORY_COLORS[entry.category] ?? "#6b7280"}12`,
                    }}
                  >
                    {formatCategory(entry.category)}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
              {formatDate(entry.created_at)}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function TicketsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("tickets-view-mode") as ViewMode) || "list"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { data: rawEntries, isPending, isFetching, refetch } = useGetList<QAEntry>("qa_entries", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "created_at", order: "DESC" },
    meta: { refreshKey },
  });

  // Silent refresh — no skeleton flash
  const handleRefresh = useCallback(() => {
    refresh();
    refetch();
  }, [refresh, refetch]);

  // Only show skeleton on first load, never on refetch
  if (isPending && !rawEntries) {
    return (
      <div className="px-6 pt-4 pb-6 max-w-5xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const entries = rawEntries ?? [];

  // Detail view
  if (selectedId !== null) {
    const ticket = entries.find((e) => e.id === selectedId);
    if (ticket) {
      return (
        <TicketDetail
          ticket={ticket}
          onBack={() => setSelectedId(null)}
          onRefresh={handleRefresh}
        />
      );
    }
  }

  return (
    <div className={`px-6 pt-2 pb-6 ${viewMode === "list" ? "max-w-5xl" : ""}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tickets</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {entries.length} ticket{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={(m) => { localStorage.setItem("tickets-view-mode", m); setViewMode(m); }} />
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        viewMode === "list" ? (
          <ListView entries={entries} onSelect={(id) => setSelectedId(id)} />
        ) : (
          <KanbanBoard
            entries={entries}
            onSelect={(id) => setSelectedId(id)}
            onStatusChange={async (id, newStatus) => {
              // Fire and forget — optimistic UI handles the visual
              updateTicket(id, { status: newStatus }).then(() => {
                // Silent background refetch after API completes
                setTimeout(handleRefresh, 500);
              });
            }}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Ticket className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask Jarvis a question in the chat to create your first ticket.
          </p>
        </div>
      )}

      <NewTicketDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleRefresh}
      />
    </div>
  );
}

TicketsPage.path = "/tickets";
