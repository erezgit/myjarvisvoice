import { useMemo } from "react";
import { useGetList, useCanAccess } from "ra-core";
import { Navigate } from "react-router";
import { BarChart3, Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Order } from "../types";

// ── Aggregation helpers ───────────────────────────────────────

type TopEntry = { label: string; revenue: number; count: number };

const getTopProducts = (orders: Order[], limit = 5): TopEntry[] => {
  const map = new Map<string, { revenue: number; count: number }>();
  for (const o of orders) {
    const desc = o.description;
    if (!desc) continue;
    const entry = map.get(desc) ?? { revenue: 0, count: 0 };
    entry.revenue += Number(o.total_amount) || 0;
    entry.count++;
    map.set(desc, entry);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

const formatCurrency = (amount: number) =>
  `₪${amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;

// ── Components ────────────────────────────────────────────────

const TopList = ({
  title,
  icon: Icon,
  entries,
  loading,
  countLabel = "orders",
}: {
  title: string;
  icon: typeof Package;
  entries: TopEntry[];
  loading: boolean;
  countLabel?: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">{i + 1}</span>
                <span className="text-sm truncate">{entry.label}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm font-medium">{formatCurrency(entry.revenue)}</span>
                <span className="text-xs text-muted-foreground w-14 text-right">
                  {entry.count} {entry.count === 1 ? countLabel.replace(/s$/, "") : countLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ── Main page ─────────────────────────────────────────────────

export const SalesAnalytics = () => {
  const { canAccess, isPending: isPendingAccess } = useCanAccess({
    resource: "sales_analytics",
    action: "list",
  });

  // Product data from orders
  const { data: orders, isPending } = useGetList<Order>("orders", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "order_date", order: "DESC" },
  });

  const allOrders = orders ?? [];

  const topProducts = useMemo(() => getTopProducts(allOrders), [allOrders]);

  if (!isPendingAccess && !canAccess) {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Sales Analytics</h1>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopList title="Top Products" icon={Package} entries={topProducts} loading={isPending} countLabel="orders" />
      </div>
    </div>
  );
};
