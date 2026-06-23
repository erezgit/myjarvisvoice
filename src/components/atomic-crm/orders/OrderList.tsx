import { formatRelative } from "date-fns";
import {
  FilterLiveForm,
  RecordContextProvider,
  useListContext,
} from "ra-core";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { List } from "@/components/admin/list";
import { CreateButton } from "@/components/admin/create-button";
import { SearchInput } from "@/components/admin/search-input";
import { SortButton } from "@/components/admin/sort-button";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { TopToolbar } from "../layout/TopToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Order } from "../types";

// ---------- Status filter dropdown ----------

const OrderStatusDropdown = () => {
  const { orderStages } = useConfigurationContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          Status
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
        {orderStages.map((stage) => (
          <ToggleFilterButton
            key={stage.value}
            className="w-full justify-start h-8"
            label={
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.label}
              </span>
            }
            value={{ "status@eq": stage.value }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ---------- Actions toolbar ----------

const FlexForm = (props: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form className="flex-1 max-w-xs" {...props} />
);

const OrderListActions = () => (
  <TopToolbar className="w-full flex-wrap">
    <FilterLiveForm formComponent={FlexForm}>
      <SearchInput source="q" placeholder="Search orders..." />
    </FilterLiveForm>
    <OrderStatusDropdown />
    <div className="flex items-center gap-2 ml-auto">
      <SortButton fields={["order_date", "total_amount", "status"]} />
      <CreateButton />
    </div>
  </TopToolbar>
);

// ---------- List content (card-style rows) ----------

const OrderListContent = () => {
  const { data: orders, isPending, error } = useListContext<Order>();

  if (isPending) return <Skeleton className="w-full h-9" />;
  if (error) return null;

  return (
    <div className="md:divide-y">
      {orders.map((order) => (
        <RecordContextProvider key={order.id} value={order}>
          <OrderItem order={order} />
        </RecordContextProvider>
      ))}
      {orders.length === 0 && (
        <div className="p-4">
          <div className="text-muted-foreground">No orders found</div>
        </div>
      )}
    </div>
  );
};

const OrderItem = ({ order }: { order: Order }) => {
  const { orderStages } = useConfigurationContext();
  const stage = orderStages.find((s) => s.value === order.status);
  const now = Date.now();

  const contactName = [order.contact_first_name, order.contact_last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      to={`/orders/${order.id}/show`}
      className="flex flex-row items-center px-4 py-3 hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {order.order_number ? `#${order.order_number}` : `#${order.id}`}
          </span>
          {contactName && (
            <span className="text-muted-foreground">{contactName}</span>
          )}
          <Badge
            variant="outline"
            style={{
              backgroundColor: `${stage?.color}20`,
              color: stage?.color,
              borderColor: `${stage?.color}40`,
            }}
          >
            {stage?.label || order.status}
          </Badge>
        </div>
        {order.description && (
          <div className="text-sm text-muted-foreground mt-0.5">
            {order.description}
          </div>
        )}
      </div>
      <div className="text-right ml-4 shrink-0">
        {order.total_amount != null && (
          <div className="font-medium">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: "ILS",
            }).format(Number(order.total_amount))}
          </div>
        )}
        {order.order_date && (
          <div className="text-sm text-muted-foreground">
            {formatRelative(order.order_date, now)}
          </div>
        )}
      </div>
    </Link>
  );
};

// ---------- Main component ----------

export const OrderList = () => (
  <List
    title={false}
    actions={<OrderListActions />}
    sort={{ field: "order_date", order: "DESC" }}
    perPage={25}
  >
    <div className="flex flex-col gap-4">
      <Card className="py-0">
        <OrderListContent />
      </Card>
    </div>
  </List>
);
