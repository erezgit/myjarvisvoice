import type { SectionComponentProps } from "./registry";

type Question = { title: string; description: string };

export function OpenQuestionsSection({ data }: SectionComponentProps) {
  const items = data as Question[];
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((q, i) => (
        <div key={i} className="rounded-lg border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground mb-1">{q.title}</h3>
          <p className="text-xs text-muted-foreground">{q.description}</p>
        </div>
      ))}
    </div>
  );
}
