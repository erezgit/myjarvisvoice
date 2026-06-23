import type { SectionComponentProps } from "./registry";

type Kpi = { label: string; value: string; trend?: string; trend_direction?: string };

export function KpiCardsSection({ data }: SectionComponentProps) {
  const items = data as Kpi[];
  if (!items?.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((kpi, i) => (
        <div key={i} className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          {kpi.trend && (
            <div className={`text-xs font-medium mt-1 ${kpi.trend_direction === "down" ? "text-red-500" : "text-emerald-500"}`}>
              {kpi.trend_direction === "down" ? "↓" : "↑"} {kpi.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
