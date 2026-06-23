import { CheckCircle2 } from "lucide-react";
import type { SectionComponentProps } from "./registry";

type CheckItem = { text: string; checked: boolean; owner?: string; due?: string };

export function ChecklistSection({ data }: SectionComponentProps) {
  const items = data as CheckItem[];
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${item.checked ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"}`}>
            {item.checked && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground/50" : "text-foreground"}`}>{item.text}</span>
          {item.owner && <span className="text-xs text-muted-foreground">{item.owner}</span>}
          {item.due && <span className="text-[10px] text-muted-foreground">{item.due}</span>}
        </div>
      ))}
    </div>
  );
}
