import type { SectionComponentProps } from "./registry";

type Contact = { name: string; status: string; description: string };

export function ContactsSection({ data }: SectionComponentProps) {
  const items = data as Contact[];
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((c, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">{c.description}</p>
        </div>
      ))}
    </div>
  );
}
