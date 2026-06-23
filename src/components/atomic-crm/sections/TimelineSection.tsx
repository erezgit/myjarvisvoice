import type { SectionComponentProps } from "./registry";

type TimelineItem = { time?: string; section?: string; topic?: string };

export function TimelineSection({ data }: SectionComponentProps) {
  const items = data as TimelineItem[];
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 py-2 border-b border-border last:border-0">
          <span className="text-violet-400 font-mono text-xs w-24 shrink-0 pt-0.5">
            {item.time ?? item.section ?? ""}
          </span>
          <span className="text-sm text-muted-foreground">{item.topic}</span>
        </div>
      ))}
    </div>
  );
}
