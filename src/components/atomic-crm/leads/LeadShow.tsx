import { formatRelative } from "date-fns";
import {
  RecordRepresentation,
  ShowBase,
  useShowContext,
  useGetList,
} from "ra-core";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { DeleteButton } from "@/components/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Phone,
  MessageCircle,
  Calendar,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { NoteCreate, NotesIterator } from "../notes";
import { ContactEditSheet } from "../contacts/ContactEditSheet";
import { ContactPersonalInfo } from "../contacts/ContactPersonalInfo";
import { TagsListEdit } from "../contacts/TagsListEdit";
import { Avatar } from "../contacts/Avatar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact } from "../types";

export const LeadShow = () => (
  <ShowBase resource="contacts">
    <LeadShowContent />
  </ShowBase>
);

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

const LeadShowContent = () => {
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
          <Link to="/leads">Leads</Link>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Pipeline status bar */}
        <LeadPipelineStatusBar record={record} />

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-5 mt-5">
          {/* LEFT: Pipeline + Timeline */}
          <div className="col-span-2 space-y-5">
            {/* Follow-up card */}
            <FollowUpCard record={record} />

            {/* Lead bio */}
            {record.lead_bio && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Lead Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {record.lead_bio}
                </CardContent>
              </Card>
            )}

            {/* UTM / Tracking */}
            <TrackingCard record={record} />

            {/* Timeline */}
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

          {/* RIGHT: Lead info cards */}
          <div className="space-y-5">
            {/* Contact card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contact</CardTitle>
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

            {/* Quick actions */}
            <QuickActionsCard record={record} />

            {/* Tags card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <TagsListEdit />
              </CardContent>
            </Card>

            {/* Danger zone */}
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

// Pipeline status bar — shows activity status, qualification, readiness, source
const LeadPipelineStatusBar = ({ record }: { record: Contact }) => {
  const {
    activityStatuses,
    qualificationStatuses,
    leadSources,
    readinessLevels,
    lostReasons,
  } = useConfigurationContext();

  const activityStatus = activityStatuses.find(
    (s) => s.value === record.activity_status
  );
  const qualStatus = qualificationStatuses.find(
    (s) => s.value === record.qualification_status
  );
  const source = leadSources.find((s) => s.value === record.lead_source);
  const readiness = record.readiness_to_book
    ? readinessLevels.find((r) => r.value === record.readiness_to_book)
    : null;
  const lostReason = record.lost_reason
    ? lostReasons.find((r) => r.value === record.lost_reason)
    : null;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Status</p>
        <div className="flex items-center gap-2 mt-0.5">
          {activityStatus && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: activityStatus.color }}
            />
          )}
          <p className="text-lg font-semibold">
            {activityStatus?.label || "New"}
          </p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Qualification</p>
        <div className="flex items-center gap-2 mt-0.5">
          {qualStatus && qualStatus.value !== "select" && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: qualStatus.color }}
            />
          )}
          <p className="text-lg font-semibold">
            {qualStatus?.value === "select" ? "Pending" : qualStatus?.label || "—"}
          </p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">Source</p>
        <p className="text-lg font-semibold mt-0.5">
          {source?.label || "—"}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground">
          {lostReason ? "Lost Reason" : "Readiness"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {lostReason ? (
            <p className="text-lg font-semibold text-destructive">
              {lostReason.label}
            </p>
          ) : readiness ? (
            <>
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: readiness.color }}
              />
              <p className="text-lg font-semibold">{readiness.label}</p>
            </>
          ) : (
            <p className="text-lg font-semibold text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Follow-up card
const FollowUpCard = ({ record }: { record: Contact }) => {
  const now = Date.now();

  if (!record.followup_date && !record.last_contact_at) {
    return null;
  }

  const isOverdue =
    record.followup_date && new Date(record.followup_date) < new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Follow-up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {record.followup_date && (
          <div
            className={cn(
              "rounded-lg p-3",
              isOverdue
                ? "bg-destructive/10 border border-destructive/20"
                : "bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatRelative(record.followup_date, now)}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
            {record.followup_prompt && (
              <p className="text-sm text-muted-foreground mt-1 ml-6">
                {record.followup_prompt}
              </p>
            )}
          </div>
        )}

        {record.last_contact_at && (
          <div>
            <p className="text-xs text-muted-foreground">Last Contact</p>
            <p className="text-sm mt-0.5">
              {formatRelative(record.last_contact_at, now)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Tracking card — UTM, ManyChat, source details
const TrackingCard = ({ record }: { record: Contact }) => {
  const hasUtm =
    record.utm_source || record.utm_medium || record.utm_campaign;
  const hasTracking = hasUtm || record.manychat_id;

  if (!hasTracking) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasUtm && (
          <div className="flex flex-wrap gap-1.5">
            {record.utm_source && (
              <Badge variant="secondary" className="text-xs">
                source: {record.utm_source}
              </Badge>
            )}
            {record.utm_medium && (
              <Badge variant="secondary" className="text-xs">
                medium: {record.utm_medium}
              </Badge>
            )}
            {record.utm_campaign && (
              <Badge variant="secondary" className="text-xs">
                campaign: {record.utm_campaign}
              </Badge>
            )}
          </div>
        )}
        {record.manychat_id && (
          <div>
            <p className="text-xs text-muted-foreground">ManyChat ID</p>
            <p className="text-sm font-mono mt-0.5">{record.manychat_id}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Quick actions card — call, WhatsApp, convert to client
const QuickActionsCard = ({ record }: { record: Contact }) => {
  const phone = record.phone_jsonb?.[0]?.phone;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {phone && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={`tel:${phone}`}>
                <Phone className="h-4 w-4 mr-1.5" />
                Call
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a
                href={`https://wa.me/${phone.replace(/[^0-9+]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                WhatsApp
              </a>
            </Button>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/orders/create">
            <ArrowRight className="h-4 w-4 mr-1.5" />
            Create Order
          </Link>
        </Button>
        <Separator />
        <Button variant="default" size="sm" className="w-full" disabled>
          <UserCheck className="h-4 w-4 mr-1.5" />
          Convert to Client
        </Button>
      </CardContent>
    </Card>
  );
};
