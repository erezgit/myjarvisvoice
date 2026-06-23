import type { DataProvider, Identifier } from "ra-core";

import {
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
} from "../../consts";
import type {
  Activity,
  Contact,
  ContactNote,
} from "../../types";

// FIXME: Requires 5 large queries to get the latest activities.
// Replace with a server-side view or a custom API endpoint.
export async function getActivityLog(
  dataProvider: DataProvider,
  companyId?: Identifier,
  memberId?: Identifier,
) {
  const filter = {} as any;
  if (companyId) {
    filter.company_id = companyId;
  } else if (memberId) {
    filter["member_id@in"] = `(${memberId})`;
  }

  const activities = await getNewContactsAndNotes(dataProvider, filter);
  return activities
    // sort by date desc
    .sort(
      (a, b) =>
        (a.date || new Date(0).toISOString()).localeCompare(
          b.date || new Date(0).toISOString(),
        ) * -1,
    )
    // limit to 250 activities
    .slice(0, 250);
}

async function getNewContactsAndNotes(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
    filter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "first_seen", order: "DESC" },
  });

  const recentContactNotesFilter = {} as any;
  if (filter.member_id) {
    recentContactNotesFilter.member_id = filter.member_id;
  }
  if (filter.company_id) {
    // No company_id field in contactNote, filtering by related contacts instead.
    // This filter is only valid if a company has less than 250 contact.
    const contactIds = contacts.map((contact) => contact.id).join(",");
    recentContactNotesFilter["contact_id@in"] = `(${contactIds})`;
  }

  const { data: contactNotes } = await dataProvider.getList<ContactNote>(
    "contact_notes",
    {
      filter: recentContactNotesFilter,
      pagination: { page: 1, perPage: 250 },
      sort: { field: "date", order: "DESC" },
    },
  );

  const newContacts = contacts.map((contact) => ({
    id: `contact.${contact.id}.created`,
    type: CONTACT_CREATED,
    company_id: contact.company_id,
    member_id: contact.member_id,
    contact,
    date: contact.first_seen,
  }));

  const newContactNotes = contactNotes.map((contactNote) => ({
    id: `contactNote.${contactNote.id}.created`,
    type: CONTACT_NOTE_CREATED,
    member_id: contactNote.member_id,
    contactNote,
    date: contactNote.date,
  }));

  return [...newContacts, ...newContactNotes];
}
