import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { SectionComponentProps } from "./registry";

type Decision = { title: string; description: string; status: string };

export function DecisionsSection({ data }: SectionComponentProps) {
  const items = data as Decision[];
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((d, i) => {
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
  );
}
