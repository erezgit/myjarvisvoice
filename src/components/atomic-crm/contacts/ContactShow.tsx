import {
  RecordRepresentation,
  ShowBase,
  useShowContext,
  useGetList,
} from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import { ReferenceManyCount } from "@/components/admin/reference-many-count";
import { TextField } from "@/components/admin/text-field";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { DeleteButton } from "@/components/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Pencil, ChevronUp, ChevronDown } from "lucide-react";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { NoteCreate, NotesIterator, NotesIteratorMobile } from "../notes";
import { NoteCreateSheet } from "../notes/NoteCreateSheet";
import { ContactEditSheet } from "./ContactEditSheet";
import { TagsListEdit } from "./TagsListEdit";
import { ContactPersonalInfo } from "./ContactPersonalInfo";
import { ContactBackgroundInfo } from "./ContactBackgroundInfo";
import { ContactTasksList } from "./ContactTasksList";
import { ContactMergeButton } from "./ContactMergeButton";
import { ExportVCardButton } from "./ExportVCardButton";
import type { Contact, Order } from "../types";
import { Avatar } from "./Avatar";
import { MobileBackButton } from "../misc/MobileBackButton";
import { Link } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ContactShow = () => {
  const isMobile = useIsMobile();

  return (
    <ShowBase>
      {isMobile ? <ContactShowContentMobile /> : <ContactShowContent />}
    </ShowBase>
  );
};

const ContactShowContentMobile = () => {
  const { record, isPending } = useShowContext<Contact>();
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  if (isPending || !record) return null;

  return (
    <>
      {/* We need to repeat the note creation sheet here to support the note
      create button that is rendered when there are no notes. */}
      <NoteCreateSheet
        open={noteCreateOpen}
        onOpenChange={setNoteCreateOpen}
        contact_id={record.id}
      />
      <ContactEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        contactId={record.id}
      />
      <MobileHeader>
        <MobileBackButton />
        <div className="flex flex-1">
          <Link to="/contacts">
            <h1 className="text-xl font-semibold">
              <RecordRepresentation />
            </h1>
          </Link>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-5" />
          <span className="sr-only">Edit record</span>
        </Button>
      </MobileHeader>
      <MobileContent>
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Avatar />
            <div className="mx-3 flex-1">
              <h2 className="text-2xl font-bold">
                <RecordRepresentation />
              </h2>
              <div className="text-sm text-muted-foreground">
                {record.title}
                {record.title && record.company_id != null && " at "}
                {record.company_id != null && (
                  <ReferenceField
                    source="company_id"
                    reference="companies"
                    link="show"
                  >
                    <TextField source="name" className="underline" />
                  </ReferenceField>
                )}
              </div>
            </div>
            <div>
              <ReferenceField
                source="company_id"
                reference="companies"
                link="show"
                className="no-underline"
              >
                <CompanyAvatar />
              </ReferenceField>
            </div>
          </div>
        </div>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="tasks">
              <ReferenceManyCount
                target="contact_id"
                reference="tasks"
                filter={{ "done_date@is": null }}
              />{" "}
              Tasks
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4">
            <ReferenceManyField
              target="contact_id"
              reference="contact_notes"
              sort={{ field: "date", order: "DESC" }}
              empty={
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground mb-4">No notes yet</p>
                  <Button
                    variant="outline"
                    onClick={() => setNoteCreateOpen(true)}
                  >
                    Add note
                  </Button>
                </div>
              }
            >
              <NotesIteratorMobile contactId={record.id} showStatus />
            </ReferenceManyField>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <ContactTasksList />
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Personal info</h3>
                <Separator />
                <div className="mt-3">
                  <ContactPersonalInfo />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Background info</h3>
                <Separator />
                <div className="mt-3">
                  <ContactBackgroundInfo />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Tags</h3>
                <Separator />
                <div className="mt-3">
                  <TagsListEdit />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </MobileContent>
    </>
  );
};

// -- Desktop --

const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
};

const ContactShowContent = () => {
  const { record, isPending } = useShowContext<Contact>();
  const [editOpen, setEditOpen] = useState(false);
  if (isPending || !record) return null;

  return (
    <>
      <ContactEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        contactId={record.id}
      />
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link to="/contacts">Clients</Link>
        </Breadcrumb.Item>
        <Breadcrumb.PageItem>
          <RecordRepresentation />
        </Breadcrumb.PageItem>
      </Breadcrumb>

      <div className="mt-2 mb-2">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">
            {record.first_name} {record.last_name}
          </h1>
          <div className="flex items-center gap-2">
            <ContactPrevNext />
          </div>
        </div>

        {/* Summary stats row */}
        <SummaryStats record={record} />

        {/* Two-column layout: content left, info right */}
        <div className="grid grid-cols-3 gap-5 mt-5">
          {/* LEFT: Timeline */}
          <div className="col-span-2 space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-3">Timeline</h2>
              <ReferenceManyField
                target="contact_id"
                reference="contact_notes"
                sort={{ field: "date", order: "DESC" }}
                empty={<NoteCreate reference="contacts" showStatus />}
              >
                <NotesIterator reference="contacts" showStatus />
              </ReferenceManyField>
            </div>
          </div>

          {/* RIGHT: Customer info cards */}
          <div className="space-y-5">
            {/* Customer card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Customer</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar />
                  <div>
                    <p className="font-medium">
                      {record.first_name} {record.last_name}
                    </p>
                    {record.date_of_birth && (
                      <p className="text-xs text-muted-foreground">
                        {calculateAge(record.date_of_birth)} y.o.
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
                <ContactPersonalInfo />
                {record.date_of_birth && (
                  <p className="text-muted-foreground text-xs">
                    DOB:{" "}
                    {new Date(record.date_of_birth).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Background card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Background</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <ContactBackgroundInfo />
              </CardContent>
            </Card>

            {/* Tags card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <TagsListEdit />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2 items-start">
              <ExportVCardButton />
              <ContactMergeButton />
            </div>
            <div className="flex flex-col gap-2 items-start">
              <DeleteButton
                className="h-6 cursor-pointer hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Summary stats row (Shopify style)
const SummaryStats = ({ record }: { record: Contact }) => {
  const { data: orders } = useGetList<Order>("orders", {
    filter: { "contact_id@eq": record.id },
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "order_date", order: "DESC" },
  });

  const totalSpent =
    orders?.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    ) ?? 0;
  const orderCount = orders?.length ?? 0;

  const customerSince = record.first_seen
    ? new Date(record.first_seen).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Amount spent</p>
        <p className="text-lg font-semibold mt-0.5">
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "ILS",
          }).format(totalSpent)}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Orders</p>
        <p className="text-lg font-semibold mt-0.5">{orderCount}</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Customer since</p>
        <p className="text-lg font-semibold mt-0.5">{customerSince}</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Lifecycle</p>
        <p className="text-lg font-semibold mt-0.5 capitalize">
          {record.lifecycle_stage?.replace("_", " ") || "New Lead"}
        </p>
      </div>
    </div>
  );
};

// Last order placed card
const LastOrderCard = ({ record }: { record: Contact }) => {
  const { orderStages } = useConfigurationContext();
  const { data, isLoading } = useGetList<Order>("orders", {
    filter: { "contact_id@eq": record.id },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "order_date", order: "DESC" },
  });

  if (isLoading || !data || data.length === 0) return null;

  const order = data[0];
  const stage = orderStages.find((s) => s.value === order.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Last order placed</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          to={`/orders/${order.id}/show`}
          className="block hover:bg-muted/50 rounded-lg p-3 -m-3 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">#{order.id}</span>
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
            <span className="text-sm font-medium">
              {order.total_amount != null &&
                new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "ILS",
                }).format(Number(order.total_amount))}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(order.order_date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </Link>
        <Separator className="my-3" />
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/orders">View all orders</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/orders/create">Create order</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Prev/Next navigation arrows
const ContactPrevNext = () => {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-7 w-7" disabled>
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7" disabled>
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
};

