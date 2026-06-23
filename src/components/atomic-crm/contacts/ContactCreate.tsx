import { CreateBase, Form, useGetIdentity } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Contact } from "../types";
import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const ContactCreate = () => {
  const { identity } = useGetIdentity();
  return (
    <CreateBase
      redirect="show"
      transform={(data: Contact) => ({
        ...data,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        tags: [],
        lifecycle_stage: data.lifecycle_stage || "new_lead",
      })}
    >
      <div className="mt-2 flex lg:mr-72">
        <div className="flex-1">
          <Form defaultValues={{ member_id: identity?.id, lifecycle_stage: "new_lead" }}>
            <Card>
              <CardContent>
                <ContactInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
