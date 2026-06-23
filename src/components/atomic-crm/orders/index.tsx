import type { Order } from "../types";
import { OrderCreate } from "./OrderCreate";
import { OrderEdit } from "./OrderEdit";
import { OrderList } from "./OrderList";
import { OrderShow } from "./OrderShow";

export default {
  list: OrderList,
  show: OrderShow,
  edit: OrderEdit,
  create: OrderCreate,
  recordRepresentation: (record: Order) =>
    `Order #${record?.id}`,
};
