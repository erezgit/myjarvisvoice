import { Card, CardContent } from "@/components/ui/card";
import { EditBase, Form, useEditContext } from "ra-core";

import type { Order } from "../types";
import { OrderInputs } from "./OrderInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const OrderEdit = () => (
  <EditBase redirect="show">
    <OrderEditContent />
  </EditBase>
);

const OrderEditContent = () => {
  const { isPending, record } = useEditContext<Order>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <OrderInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};
