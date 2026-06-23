import type { Contact } from "../types";
import { LeadList } from "./LeadList";
import { LeadShow } from "./LeadShow";

export default {
  list: LeadList,
  show: LeadShow,
  recordRepresentation: (record: Contact) =>
    record?.first_name + " " + record?.last_name,
};
