import type {
  Company,
  Contact,
  ContactNote,
  Member,
  Order,
  Tag,
  Task,
} from "../../../types";

export interface Db {
  companies: Required<Company>[];
  contacts: Required<Contact>[];
  contact_notes: ContactNote[];
  members: Member[];
  tags: Tag[];
  tasks: Task[];
  orders: Order[];
}
