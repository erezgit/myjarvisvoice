import { useRecordContext } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { Badge } from "@/components/ui/badge";

import { TopToolbar } from "../layout/TopToolbar";

const MembersListActions = () => (
  <TopToolbar>
    <ExportButton />
    <CreateButton label="New user" />
  </TopToolbar>
);

const filters = [<SearchInput source="q" alwaysOn />];

const ROLE_COLORS: Record<string, string> = {
  admin: "border-blue-300 dark:border-blue-700",
  manager: "border-purple-300 dark:border-purple-700",
  member: "border-green-300 dark:border-green-700",
  office: "border-gray-300 dark:border-gray-700",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  office: "Office",
};

const RoleField = (_props: { label?: string | boolean }) => {
  const record = useRecordContext();
  if (!record) return null;
  const role = record.role || (record.administrator ? "admin" : "member");
  return (
    <div className="flex flex-row gap-1">
      <Badge variant="outline" className={ROLE_COLORS[role] || ""}>
        {ROLE_LABELS[role] || role}
      </Badge>
      {record.disabled && (
        <Badge
          variant="outline"
          className="border-orange-300 dark:border-orange-700"
        >
          Disabled
        </Badge>
      )}
    </div>
  );
};

export function MembersList() {
  return (
    <List
      filters={filters}
      actions={<MembersListActions />}
      sort={{ field: "first_name", order: "ASC" }}
    >
      <DataTable>
        <DataTable.Col source="first_name" />
        <DataTable.Col source="last_name" />
        <DataTable.Col source="email" />
        <DataTable.Col source="role" label="Role">
          <RoleField />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
