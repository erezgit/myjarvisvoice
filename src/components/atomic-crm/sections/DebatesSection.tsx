import type { SectionComponentProps } from "./registry";

const COLORS: Record<string, string> = { Erez: "#a78bfa", Yaron: "#60a5fa", Dvir: "#34d399", Tom: "#fbbf24" };

type Debate = { title: string; positions: Record<string, string>; status: string; decision?: string };

export function DebatesSection({ data }: SectionComponentProps) {
  const items = Array.isArray(data) ? data as Debate[] : [data as Debate];
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((debate, i) => (
        <div key={i} className="rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">{debate.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${debate.status === "resolved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {debate.status}
            </span>
          </div>
          <div className="space-y-1.5 ml-1">
            {Object.entries(debate.positions ?? {}).map(([name, position]) => {
              const cap = name.charAt(0).toUpperCase() + name.slice(1);
              const color = COLORS[cap] ?? "#a1a1aa";
              return (
                <div key={name} className="flex items-start gap-2 text-xs">
                  <span className="font-medium shrink-0" style={{ color }}>{cap}:</span>
                  <span className="text-muted-foreground">{position}</span>
                </div>
              );
            })}
          </div>
          {debate.decision && <p className="text-xs text-emerald-500 mt-2 font-medium">→ {debate.decision}</p>}
        </div>
      ))}
    </div>
  );
}
