import type { SectionComponentProps } from "./registry";

type DeepDive = { title: string; points: string[] };

export function DeepDivesSection({ data }: SectionComponentProps) {
  const items = data as DeepDive[];
  if (!items?.length) return null;
  return (
    <div className="space-y-4">
      {items.map((dive, i) => (
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
  );
}
