import type { Contact } from "../types";
import { ContactEdit } from "./ContactEdit";
import { ContactList } from "./ContactList";
import { ContactShow } from "./ContactShow";

export default {
  list: ContactList,
  show: ContactShow,
  edit: ContactEdit,
  recordRepresentation: (record: Contact) =>
    record?.first_name + " " + record?.last_name,
};
