import { useState } from "react";
import { formatRelative } from "date-fns";
import {
  RecordRepresentation,
  ShowBase,
  useShowContext,
  useGetList,
  useRefresh,
} from "ra-core";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { EditButton } from "@/components/admin/edit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Package,
  Calendar,
  User,
  Receipt,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { supabase } from "../providers/supabase/supabase";

import type { Order } from "../types";

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "ILS",
  }).format(Number(amount));
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const OrderShow = () => {
  return (
    <ShowBase>
      <OrderShowContent />
    </ShowBase>
  );
};

const OrderShowContent = () => {
  const { record, isPending } = useShowContext<Order>();
  const { orderStages } = useConfigurationContext();

  if (isPending || !record) return null;

  const stage = orderStages.find((s) => s.value === record.status);
  const now = Date.now();

  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link to="/orders">Orders</Link>
        </Breadcrumb.Item>
        <Breadcrumb.PageItem>
          <RecordRepresentation />
        </Breadcrumb.PageItem>
      </Breadcrumb>

      <div className="mt-2 mb-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              {record.order_number
                ? `#${record.order_number}`
                : `Order #${record.id}`}
            </h1>
            <Badge
              variant="outline"
              style={{
                backgroundColor: `${stage?.color}20`,
                color: stage?.color,
                borderColor: `${stage?.color}40`,
              }}
            >
              {stage?.label || record.status}
            </Badge>
          </div>
          <EditButton />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold mt-0.5">
              {formatCurrency(record.total_amount)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold mt-0.5">
              {formatCurrency(record.open_balance)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Order Date</p>
            <p className="text-lg font-semibold mt-0.5">
              {formatDate(record.order_date) || "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Expected Delivery</p>
            <p className="text-lg font-semibold mt-0.5">
              {formatDate(record.expected_delivery) || "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* LEFT: Details + Timeline */}
          <div className="col-span-2 space-y-5">
            {/* Order details */}
            {record.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {record.description}
                </CardContent>
              </Card>
            )}

            {/* Order timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline record={record} now={now} />
              </CardContent>
            </Card>

            {/* Notes */}
            {record.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {record.notes}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Customer + Assignment + Financial */}
          <div className="space-y-5">
            {/* Customer card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <ReferenceField
                  source="contact_id"
                  reference="contacts"
                  link="show"
                >
                  <TextField source="first_name" />{" "}
                  <TextField source="last_name" />
                </ReferenceField>
              </CardContent>
            </Card>

            {/* Assignment card */}
            {record.member_id != null && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" /> Assigned Member
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <ReferenceField
                    source="member_id"
                    reference="members"
                    link={false}
                  >
                    <TextField source="first_name" />{" "}
                    <TextField source="last_name" />
                  </ReferenceField>
                </CardContent>
              </Card>
            )}

            {/* Financial card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Financial</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">
                    {formatCurrency(record.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium">
                    {formatCurrency(
                      (record.total_amount ?? 0) -
                        (record.open_balance ?? 0)
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span
                    className={`font-medium ${(record.open_balance ?? 0) > 0 ? "text-destructive" : "text-green-500"}`}
                  >
                    {formatCurrency(record.open_balance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

// Timeline — shows lifecycle dates as a vertical progress
const OrderTimeline = ({
  record,
  now,
}: {
  record: Order;
  now: number;
}) => {
  const steps: { label: string; date: string | null | undefined }[] = [
    { label: "Ordered", date: record.order_date },
    { label: "Expected Delivery", date: record.expected_delivery },
    { label: "Completed", date: record.completed_date },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3 text-sm">
          {step.date ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={step.date ? "font-medium" : "text-muted-foreground"}>
            {step.label}
          </span>
          {step.date && (
            <span className="text-muted-foreground ml-auto">
              {formatRelative(step.date, now)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
