import type { SectionComponentProps } from "./registry";

export function KeyValueSection({ data }: SectionComponentProps) {
  // Supports both flat pairs and grouped pairs
  if (!data) return null;

  // If data has a "pairs" key, render flat
  if (Array.isArray(data.pairs)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.pairs.map((pair: { label: string; value: string }, i: number) => (
          <div key={i} className="flex justify-between text-xs p-3 rounded-lg border bg-muted/30">
            <span className="text-muted-foreground">{pair.label}</span>
            <span className="text-foreground font-medium">{pair.value}</span>
          </div>
        ))}
      </div>
    );
  }

  // If data is a Record of groups
  const entries = Object.entries(data).filter(([k]) => k !== "title");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 capitalize">{key.replace(/_/g, " ")}</h3>
          {typeof value === "object" && value !== null && !Array.isArray(value) ? (
            <div className="space-y-1.5">
              {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="text-foreground font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
