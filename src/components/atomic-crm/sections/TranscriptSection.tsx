import type { SectionComponentProps } from "./registry";

const COLORS: Record<string, string> = { Erez: "#a78bfa", Yaron: "#60a5fa", Dvir: "#34d399", Tom: "#fbbf24" };

type Segment = { speaker: string; timestamp: string; text: string };

export function TranscriptSection({ data }: SectionComponentProps) {
  const items = data as Segment[];
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((seg, i) => {
        const color = COLORS[seg.speaker] ?? "#a1a1aa";
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
  );
}
