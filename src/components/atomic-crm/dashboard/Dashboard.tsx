import { Link } from "react-router";
import {
  MessageSquare,
  FolderTree,
  TrendingUp,
  Home,
} from "lucide-react";

const pages = [
  {
    icon: MessageSquare,
    label: "Q&A Log",
    to: "/qa-log",
    color: "#58a6ff",
    description: "Every customer question and answer, logged and searchable — your institutional memory.",
  },
  {
    icon: FolderTree,
    label: "Knowledge Base",
    to: "/knowledge-base",
    color: "#a78bfa",
    description: "OPX 1000 technical docs, multi-chassis research, and SME directory — the agent's brain.",
  },
  {
    icon: TrendingUp,
    label: "Insights",
    to: "/insights",
    color: "#3fb950",
    description: "Questions answered, confidence scores, top categories — your impact at a glance.",
  },
];

export const Dashboard = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "color-mix(in srgb, #58a6ff 15%, transparent)" }}
        >
          <Home className="w-5 h-5" style={{ color: "#58a6ff" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, Michaela</h1>
          <p className="text-sm text-muted-foreground">
            Your QM technical support assistant — ask anything about OPX 1000.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 mb-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Type a customer question in the chat panel on the right. The agent searches the knowledge base,
          composes a structured brief with sources and classification, and logs it to the Q&A Log.
          Copy the brief, paste into email — done.
        </p>
      </div>

      {/* Page cards */}
      <div className="space-y-3">
        {pages.map((page) => (
          <Link
            key={page.to}
            to={page.to}
            className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
          >
            <div
              className="mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${page.color} 12%, transparent)`,
              }}
            >
              <page.icon className="w-4 h-4" style={{ color: page.color }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{page.label}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{page.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
