import { CreateBase, Form, useGetIdentity } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Order } from "../types";
import { OrderInputs } from "./OrderInputs";
import { FormToolbar } from "../layout/FormToolbar";

export const OrderCreate = () => {
  const { identity } = useGetIdentity();
  return (
    <CreateBase
      redirect="show"
      transform={(data: Order) => ({
        ...data,
        order_date: data.order_date || new Date().toISOString(),
        status: data.status || "pending",
      })}
    >
      <div className="mt-2 flex lg:mr-72">
        <div className="flex-1">
          <Form defaultValues={{ member_id: identity?.id, status: "pending", order_date: new Date().toISOString() }}>
            <Card>
              <CardContent>
                <OrderInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
