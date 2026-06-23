import { useRecordContext } from "ra-core";
import { DeleteButton } from "@/components/admin";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AddTask } from "../tasks/AddTask";
import { TasksIterator } from "../tasks/TasksIterator";
import { TagsListEdit } from "./TagsListEdit";
import { ContactPersonalInfo } from "./ContactPersonalInfo";
import { ContactBackgroundInfo } from "./ContactBackgroundInfo";
import type { Contact } from "../types";
import { ContactMergeButton } from "./ContactMergeButton";
import { ExportVCardButton } from "./ExportVCardButton";

export const ContactAside = ({
  link = "edit",
}: {
  link?: "edit" | "show";
}) => {
  const record = useRecordContext<Contact>();

  if (!record) return null;
  return (
    <div className="hidden sm:block space-y-6 text-sm">
      <Card>
        <CardHeader>
          <CardTitle>Personal info</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactPersonalInfo />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Background</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactBackgroundInfo />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <TagsListEdit />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferenceManyField
            target="contact_id"
            reference="tasks"
            sort={{ field: "due_date", order: "ASC" }}
          >
            <TasksIterator />
          </ReferenceManyField>
          <AddTask />
        </CardContent>
      </Card>

      {link !== "edit" && (
        <>
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
        </>
      )}
    </div>
  );
};
