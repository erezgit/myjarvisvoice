import { endOfYesterday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CheckSquare, ChevronDown, Clock, Tag, TrendingUp, Users } from "lucide-react";
import { useGetIdentity, useGetList, useListContext } from "ra-core";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FilterCategory } from "../filters/FilterCategory";
import { Status } from "../misc/Status";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { ResponsiveFilters } from "../misc/ResponsiveFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActiveFilterButton } from "../misc/ActiveFilterButton";

// ---------- Desktop dropdown filter buttons ----------

const LastActivityDropdown = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" className="h-9">
        <Clock className="h-4 w-4 mr-1.5" />
        Last activity
        <ChevronDown className="ml-1.5 h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
      <ToggleFilterButton
        className="w-full justify-start h-8"
        label="Today"
        value={{
          "last_seen@gte": endOfYesterday().toISOString(),
          "last_seen@lte": undefined,
        }}
      />
      <ToggleFilterButton
        className="w-full justify-start h-8"
        label="This week"
        value={{
          "last_seen@gte": startOfWeek(new Date()).toISOString(),
          "last_seen@lte": undefined,
        }}
      />
      <ToggleFilterButton
        className="w-full justify-start h-8"
        label="Before this week"
        value={{
          "last_seen@gte": undefined,
          "last_seen@lte": startOfWeek(new Date()).toISOString(),
        }}
      />
      <ToggleFilterButton
        className="w-full justify-start h-8"
        label="Before this month"
        value={{
          "last_seen@gte": undefined,
          "last_seen@lte": startOfMonth(new Date()).toISOString(),
        }}
      />
      <ToggleFilterButton
        className="w-full justify-start h-8"
        label="Before last month"
        value={{
          "last_seen@gte": undefined,
          "last_seen@lte": subMonths(
            startOfMonth(new Date()),
            1,
          ).toISOString(),
        }}
      />
    </DropdownMenuContent>
  </DropdownMenu>
);

const StatusDropdown = () => {
  const { noteStatuses } = useConfigurationContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <TrendingUp className="h-4 w-4 mr-1.5" />
          Status
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
        {noteStatuses.map((status) => (
          <ToggleFilterButton
            key={status.value}
            className="w-full justify-start h-8"
            label={
              <span>
                {status.label} <Status status={status.value} />
              </span>
            }
            value={{ status: status.value }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TagsDropdown = () => {
  const { data } = useGetList("tags", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "name", order: "ASC" },
  });

  if (!data || data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Tag className="h-4 w-4 mr-1.5" />
          Tags
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 flex flex-col gap-0.5 min-w-40">
        {data.map((record) => (
          <ToggleFilterButton
            key={record.id}
            className="w-full justify-start h-8"
            label={
              <Badge
                variant="secondary"
                className="text-black text-xs font-normal cursor-pointer"
                style={{ backgroundColor: record?.color }}
              >
                {record?.name}
              </Badge>
            }
            value={{ "tags@cs": `{${record.id}}` }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Desktop filter toolbar — dropdown buttons rendered inline with search */
export const ContactListFilterToolbar = () => (
  <div className="flex items-center gap-2">
    <StatusDropdown />
    <TagsDropdown />
    <LastActivityDropdown />
  </div>
);

// ---------- Mobile filters (unchanged) ----------

export const ContactListFilter = () => {
  const { noteStatuses } = useConfigurationContext();
  const isMobile = useIsMobile();
  const { identity } = useGetIdentity();
  const { data } = useGetList("tags", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "name", order: "ASC" },
  });

  return (
    <ResponsiveFilters searchInput={{ placeholder: "Search name, company..." }}>
      <FilterCategory label="Last activity" icon={<Clock />}>
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="Today"
          value={{
            "last_seen@gte": endOfYesterday().toISOString(),
            "last_seen@lte": undefined,
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="This week"
          value={{
            "last_seen@gte": startOfWeek(new Date()).toISOString(),
            "last_seen@lte": undefined,
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="Before this week"
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": startOfWeek(new Date()).toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="Before this month"
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": startOfMonth(new Date()).toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="Before last month"
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": subMonths(
              startOfMonth(new Date()),
              1,
            ).toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
      </FilterCategory>

      <FilterCategory label="Status" icon={<TrendingUp />}>
        {noteStatuses.map((status) => (
          <ToggleFilterButton
            key={status.value}
            className="w-auto md:w-full justify-between h-10 md:h-8"
            label={
              <span>
                {status.label} <Status status={status.value} />
              </span>
            }
            value={{ status: status.value }}
            size={isMobile ? "lg" : undefined}
          />
        ))}
      </FilterCategory>

      <FilterCategory label="Tags" icon={<Tag />}>
        {data &&
          data.map((record) => (
            <ToggleFilterButton
              className="w-auto md:w-full justify-between h-10 md:h-8"
              key={record.id}
              label={
                <Badge
                  variant="secondary"
                  className="text-black text-sm md:text-xs font-normal cursor-pointer"
                  style={{
                    backgroundColor: record?.color,
                  }}
                >
                  {record?.name}
                </Badge>
              }
              value={{ "tags@cs": `{${record.id}}` }}
              size={isMobile ? "lg" : undefined}
            />
          ))}
      </FilterCategory>

      <FilterCategory icon={<CheckSquare />} label="Tasks">
        <ToggleFilterButton
          className="w-full justify-between h-10 md:h-8"
          label={"With pending tasks"}
          value={{ "nb_tasks@gt": 0 }}
          size={isMobile ? "lg" : undefined}
        />
      </FilterCategory>

      <FilterCategory icon={<Users />} label="Account Manager">
        <ToggleFilterButton
          className="w-full justify-between h-10 md:h-8"
          label={"Me"}
          value={{ member_id: identity?.id }}
          size={isMobile ? "lg" : undefined}
        />
      </FilterCategory>
    </ResponsiveFilters>
  );
};

export const ContactListFilterSummary = () => {
  const { noteStatuses } = useConfigurationContext();
  const { identity } = useGetIdentity();
  const { data } = useGetList("tags", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "name", order: "ASC" },
  });
  const { filterValues } = useListContext();
  const hasFilters = !!Object.entries(filterValues || {}).filter(
    ([key]) => key !== "q",
  ).length;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-start mb-4 gap-1">
      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label="Today"
        value={{
          "last_seen@gte": endOfYesterday().toISOString(),
          "last_seen@lte": undefined,
        }}
      />
      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label="This week"
        value={{
          "last_seen@gte": startOfWeek(new Date()).toISOString(),
          "last_seen@lte": undefined,
        }}
      />
      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label="Before this week"
        value={{
          "last_seen@gte": undefined,
          "last_seen@lte": startOfWeek(new Date()).toISOString(),
        }}
      />
      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label="Before this month"
        value={{
          "last_seen@gte": undefined,
          "last_seen@lte": startOfMonth(new Date()).toISOString(),
        }}
      />
      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label="Before last month"
        value={{
          "last_seen@gte": undefined,
          "last_seen@lte": subMonths(startOfMonth(new Date()), 1).toISOString(),
        }}
      />

      {noteStatuses.map((status) => (
        <ActiveFilterButton
          key={status.value}
          className="w-auto justify-between h-8"
          label={
            <span>
              {status.label} <Status status={status.value} />
            </span>
          }
          value={{ status: status.value }}
        />
      ))}

      {data &&
        data.map((record) => (
          <ActiveFilterButton
            className="w-auto justify-between h-8"
            key={record.id}
            label={
              <Badge
                variant="secondary"
                className="text-black text-sm md:text-xs font-normal cursor-pointer"
                style={{
                  backgroundColor: record?.color,
                }}
              >
                {record?.name}
              </Badge>
            }
            value={{ "tags@cs": `{${record.id}}` }}
          />
        ))}

      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label={"With pending tasks"}
        value={{ "nb_tasks@gt": 0 }}
      />

      <ActiveFilterButton
        className="w-auto justify-between h-8"
        label={"Managed by me"}
        value={{ member_id: identity?.id }}
      />
    </div>
  );
};
