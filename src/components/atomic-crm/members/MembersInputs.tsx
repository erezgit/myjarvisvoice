import { email, required, useGetIdentity, useRecordContext } from "ra-core";
import { BooleanInput } from "@/components/admin/boolean-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

import type { Member } from "../types";

const ROLE_CHOICES = [
  { id: "admin", name: "Admin" },
  { id: "manager", name: "Manager" },
  { id: "member", name: "Member" },
  { id: "office", name: "Office" },
];

export function MembersInputs() {
  const { identity } = useGetIdentity();
  const record = useRecordContext<Member>();
  return (
    <div className="space-y-4 w-full">
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" validate={required()} helperText={false} />
      <TextInput
        source="email"
        validate={[required(), email()]}
        helperText={false}
      />
      <SelectInput
        source="role"
        choices={ROLE_CHOICES}
        defaultValue="salesperson"
        validate={required()}
        readOnly={record?.id === identity?.id}
        helperText={false}
      />
      <BooleanInput
        source="disabled"
        readOnly={record?.id === identity?.id}
        helperText={false}
      />
    </div>
  );
}
