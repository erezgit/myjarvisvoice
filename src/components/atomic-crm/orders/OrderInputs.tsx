import { required } from "ra-core";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { DateTimeInput } from "@/components/admin/date-time-input";
import { NumberInput } from "@/components/admin/number-input";
import { Separator } from "@/components/ui/separator";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, Member } from "../types";

const MemberSelect = ({
  source,
  label,
}: {
  source: string;
  label: string;
}) => (
  <ReferenceInput
    reference="members"
    source={source}
    sort={{ field: "last_name", order: "ASC" }}
    filter={{ "disabled@neq": true }}
  >
    <SelectInput
      helperText={false}
      label={label}
      optionText={(choice: Member) =>
        `${choice.first_name} ${choice.last_name}`
      }
    />
  </ReferenceInput>
);

export const OrderInputs = () => {
  const { orderStages } = useConfigurationContext();

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* ── Order Info ── */}
      <h6 className="text-lg font-semibold">Order Info</h6>
      <div className="grid grid-cols-2 gap-4">
        <ReferenceInput
          source="contact_id"
          reference="contacts"
          perPage={10}
        >
          <SelectInput
            helperText={false}
            label="Contact"
            optionText={(choice: Contact) =>
              `${choice.first_name} ${choice.last_name}`
            }
            validate={required()}
          />
        </ReferenceInput>
        <SelectInput
          source="status"
          label="Status"
          choices={orderStages}
          helperText={false}
          optionText="label"
          optionValue="value"
          validate={required()}
          defaultValue="pending"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          source="order_number"
          label="Order Number"
          helperText={false}
        />
        <DateTimeInput
          source="order_date"
          label="Order Date"
          helperText={false}
          validate={required()}
        />
      </div>

      <Separator />

      {/* ── Order Details ── */}
      <h6 className="text-lg font-semibold">Order Details</h6>
      <TextInput
        source="description"
        label="Description"
        multiline
        helperText={false}
      />

      <Separator />

      {/* ── Dates ── */}
      <h6 className="text-lg font-semibold">Dates</h6>
      <div className="grid grid-cols-2 gap-4">
        <DateTimeInput
          source="expected_delivery"
          label="Expected Delivery"
          helperText={false}
        />
        <DateTimeInput
          source="completed_date"
          label="Completed Date"
          helperText={false}
        />
      </div>

      <Separator />

      {/* ── Assigned Member ── */}
      <h6 className="text-lg font-semibold">Assignment</h6>
      <MemberSelect source="member_id" label="Assigned Member" />

      <Separator />

      {/* ── Financial ── */}
      <h6 className="text-lg font-semibold">Financial</h6>
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          source="total_amount"
          label="Total Amount"
          helperText={false}
        />
        <NumberInput
          source="open_balance"
          label="Open Balance"
          helperText={false}
        />
      </div>

      {/* ── Notes ── */}
      <TextInput
        source="notes"
        label="Notes"
        multiline
        helperText={false}
      />
    </div>
  );
};
