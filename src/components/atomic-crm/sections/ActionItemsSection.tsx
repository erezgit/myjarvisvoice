import type { SectionComponentProps } from "./registry";

type ActionGroup = { category: string; items: string[] };

export function ActionItemsSection({ data }: SectionComponentProps) {
  const groups = data as ActionGroup[];
  if (!groups?.length) return null;
  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
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
  );
}
