import { generateCompanies } from "./companies";
import { generateContactNotes } from "./contactNotes";
import { generateContacts } from "./contacts";
import { finalize } from "./finalize";
import { generateMembers } from "./members";
import { generateOrders } from "./orders";
import { generateTags } from "./tags";
import { generateTasks } from "./tasks";
import type { Db } from "./types";

export default (): Db => {
  const db = {} as Db;
  db.members = generateMembers(db);
  db.tags = generateTags(db);
  db.companies = generateCompanies(db);
  db.contacts = generateContacts(db);
  db.contact_notes = generateContactNotes(db);
  db.tasks = generateTasks(db);
  db.orders = generateOrders(db);
  finalize(db);

  return db;
};
