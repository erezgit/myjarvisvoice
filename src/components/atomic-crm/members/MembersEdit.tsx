import { useMutation } from "@tanstack/react-query";
import {
  useDataProvider,
  useEditController,
  useNotify,
  useRecordContext,
  useRedirect,
} from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/admin/simple-form";
import { CancelButton } from "@/components/admin/cancel-button";
import { SaveButton } from "@/components/admin/form";
import { Card, CardContent } from "@/components/ui/card";

import type { CrmDataProvider } from "../providers/types";
import type { Member, MemberFormData } from "../types";
import { MembersInputs } from "./MembersInputs";

function EditToolbar() {
  return (
    <div className="flex justify-end gap-4">
      <CancelButton />
      <SaveButton />
    </div>
  );
}

export function MembersEdit() {
  const { record } = useEditController();

  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: MemberFormData) => {
      if (!record) {
        throw new Error("Record not found");
      }
      return dataProvider.membersUpdate(record.id, data);
    },
    onSuccess: () => {
      redirect("/members");
      notify("User updated successfully");
    },
    onError: () => {
      notify("An error occurred. Please try again.");
    },
  });

  const onSubmit: SubmitHandler<MemberFormData> = async (data) => {
    mutate(data);
  };

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardContent>
          <SimpleForm
            toolbar={<EditToolbar />}
            onSubmit={onSubmit as SubmitHandler<any>}
            record={record}
          >
            <MemberEditTitle />
            <MembersInputs />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}

const MemberEditTitle = () => {
  const record = useRecordContext<Member>();
  if (!record) return null;
  return (
    <h2 className="text-lg font-semibold mb-4">
      Edit {record?.first_name} {record?.last_name}
    </h2>
  );
};
