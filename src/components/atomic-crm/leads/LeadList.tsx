import { formatRelative } from "date-fns";
import {
  FilterLiveForm,
  RecordContextProvider,
  useListContext,
} from "ra-core";
import { Link } from "react-router";
import {
  ChevronDown,
  Phone,
  MessageCircle,
} from "lucide-react";
import { List } from "@/components/admin/list";
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
import { cn } from "@/lib/utils";

import { TopToolbar } from "../layout/TopToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact } from "../types";

// ---------- Filter dropdowns ----------

const ActivityStatusDropdown = () => {
  const { activityStatuses } = useConfigurationContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          Status
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
        {activityStatuses
          .filter((s) => s.value !== "none")
          .map((status) => (
            <ToggleFilterButton
              key={status.value}
              className="w-full justify-start h-8"
              label={
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.label}
                </span>
              }
              value={{ "activity_status@eq": status.value }}
            />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const QualificationDropdown = () => {
  const { qualificationStatuses } = useConfigurationContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          Qualification
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
        {qualificationStatuses.map((qs) => (
          <ToggleFilterButton
            key={qs.value}
            className="w-full justify-start h-8"
            label={
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: qs.color }}
                />
                {qs.label}
              </span>
            }
            value={{ "qualification_status@eq": qs.value }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SourceDropdown = () => {
  const { leadSources } = useConfigurationContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          Source
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
        {leadSources.map((source) => (
          <ToggleFilterButton
            key={source.value}
            className="w-full justify-start h-8"
            label={source.label}
            value={{ "lead_source@eq": source.value }}
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

const LeadListActions = () => (
  <TopToolbar className="w-full flex-wrap">
    <FilterLiveForm formComponent={FlexForm}>
      <SearchInput source="q" placeholder="Search leads..." />
    </FilterLiveForm>
    <ActivityStatusDropdown />
    <QualificationDropdown />
    <SourceDropdown />
    <div className="flex items-center gap-2 ml-auto">
      <SortButton fields={["first_name", "last_seen", "activity_status", "followup_date"]} />
    </div>
  </TopToolbar>
);

// ---------- List content ----------

const LeadListContent = () => {
  const { data: leads, isPending, error } = useListContext<Contact>();

  if (isPending) return <Skeleton className="w-full h-9" />;
  if (error) return null;

  return (
    <div className="md:divide-y">
      {leads.map((lead) => (
        <RecordContextProvider key={lead.id} value={lead}>
          <LeadRow lead={lead} />
        </RecordContextProvider>
      ))}
      {leads.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-muted-foreground">No leads found</div>
        </div>
      )}
    </div>
  );
};

const LeadRow = ({ lead }: { lead: Contact }) => {
  const { activityStatuses, qualificationStatuses, readinessLevels, leadSources } =
    useConfigurationContext();
  const activityStatus = activityStatuses.find((s) => s.value === lead.activity_status);
  const qualStatus = qualificationStatuses.find((s) => s.value === lead.qualification_status);
  const readiness = lead.readiness_to_book
    ? readinessLevels.find((r) => r.value === lead.readiness_to_book)
    : null;
  const source = leadSources.find((s) => s.value === lead.lead_source);
  const now = Date.now();

  const phone = lead.phone_jsonb?.[0]?.phone;
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");

  return (
    <div className="flex flex-row items-center px-4 py-3 hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl">
      {/* Left: lead info */}
      <Link to={`/leads/${lead.id}/show`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{fullName}</span>
          {source && (
            <Badge variant="secondary" className="text-xs">
              {source.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {phone && (
            <span className="text-sm text-muted-foreground">{phone}</span>
          )}
          {lead.last_seen && (
            <span className="text-xs text-muted-foreground">
              · {formatRelative(lead.last_seen, now)}
            </span>
          )}
        </div>
        {lead.lead_bio && (
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
            {lead.lead_bio}
          </p>
        )}
      </Link>

      {/* Center: status badges */}
      <div className="flex items-center gap-1.5 mx-4 shrink-0">
        {activityStatus && activityStatus.value !== "none" && (
          <Badge
            variant="outline"
            style={{
              backgroundColor: `${activityStatus.color}20`,
              color: activityStatus.color,
              borderColor: `${activityStatus.color}40`,
            }}
          >
            {activityStatus.label}
          </Badge>
        )}
        {qualStatus && qualStatus.value !== "select" && (
          <Badge
            variant="outline"
            style={{
              backgroundColor: `${qualStatus.color}20`,
              color: qualStatus.color,
              borderColor: `${qualStatus.color}40`,
            }}
          >
            {qualStatus.label}
          </Badge>
        )}
        {readiness && (
          <Badge
            variant="outline"
            style={{
              backgroundColor: `${readiness.color}20`,
              color: readiness.color,
              borderColor: `${readiness.color}40`,
            }}
          >
            {readiness.label}
          </Badge>
        )}
      </div>

      {/* Right: follow-up + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {lead.followup_date && (
          <div className={cn(
            "text-xs px-2 py-1 rounded",
            new Date(lead.followup_date) < new Date()
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}>
            {formatRelative(lead.followup_date, now)}
          </div>
        )}
        {phone && (
          <>
            <a
              href={`tel:${phone}`}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/${phone.replace(/[^0-9+]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Main component ----------

export const LeadList = () => (
  <List
    resource="contacts"
    title={false}
    actions={<LeadListActions />}
    filter={{ "lifecycle_stage@eq": "new_lead" }}
    sort={{ field: "last_seen", order: "DESC" }}
    perPage={25}
  >
    <div className="flex flex-col gap-4">
      <Card className="py-0">
        <LeadListContent />
      </Card>
    </div>
  </List>
);
