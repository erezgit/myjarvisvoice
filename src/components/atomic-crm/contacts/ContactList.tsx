import jsonExport from "jsonexport/dist";
import { useState } from "react";
import {
  downloadCSV,
  FilterLiveForm,
  InfiniteListBase,
  useGetIdentity,
  useListContext,
  type Exporter,
} from "ra-core";
import { Plus } from "lucide-react";
import { BulkActionsToolbar } from "@/components/admin/bulk-actions-toolbar";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { SortButton } from "@/components/admin/sort-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { Company, Contact, Member, Tag } from "../types";
import { ContactCreateDialog } from "./ContactCreateDialog";
import { ContactEmpty } from "./ContactEmpty";
import { ContactImportButton } from "./ContactImportButton";
import {
  ContactListContent,
  ContactListContentMobile,
} from "./ContactListContent";
import {
  ContactListFilterSummary,
  ContactListFilter,
  ContactListFilterToolbar,
} from "./ContactListFilter";
import { TopToolbar } from "../layout/TopToolbar";
import { InfinitePagination } from "../misc/InfinitePagination";
import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";

export const ContactList = () => {
  const { identity } = useGetIdentity();
  const [createOpen, setCreateOpen] = useState(false);

  if (!identity) return null;

  return (
    <>
      <ContactCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <List
        title={false}
        actions={<ContactListActions onCreateClick={() => setCreateOpen(true)} />}
        perPage={25}
        sort={{ field: "last_seen", order: "DESC" }}
        exporter={exporter}
        filter={{ "lifecycle_stage@neq": "new_lead" }}
      >
        <ContactListLayoutDesktop />
      </List>
    </>
  );
};

const ContactListLayoutDesktop = () => {
  const { data, isPending, filterValues } = useListContext();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;

  if (!data?.length && !hasFilters) return <ContactEmpty />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="py-0">
        <ContactListContent />
      </Card>
      <BulkActionsToolbar />
    </div>
  );
};

const FlexForm = (props: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form className="flex-1 max-w-xs" {...props} />
);

const ContactListActions = ({ onCreateClick }: { onCreateClick: () => void }) => (
  <TopToolbar className="w-full flex-wrap">
    <FilterLiveForm formComponent={FlexForm}>
      <SearchInput source="q" placeholder="Search name, company..." />
    </FilterLiveForm>
    <ContactListFilterToolbar />
    <div className="flex items-center gap-2 ml-auto">
      <SortButton fields={["first_name", "last_name", "last_seen", "lifecycle_stage"]} />
      <Button variant="outline" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Create
      </Button>
    </div>
  </TopToolbar>
);

export const ContactListMobile = () => {
  const { identity } = useGetIdentity();
  if (!identity) return null;

  return (
    <InfiniteListBase
      perPage={25}
      sort={{ field: "last_seen", order: "DESC" }}
      exporter={exporter}
      filter={{ "lifecycle_stage@neq": "new_lead" }}
    >
      <ContactListLayoutMobile />
    </InfiniteListBase>
  );
};

const ContactListLayoutMobile = () => {
  const { isPending, data, error, filterValues } = useListContext();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (!isPending && !data?.length && !hasFilters) return <ContactEmpty />;

  return (
    <div>
      <MobileHeader>
        <ContactListFilter />
      </MobileHeader>
      <MobileContent>
        <ContactListFilterSummary />
        <ContactListContentMobile />
        {!error && (
          <div className="flex justify-center">
            <InfinitePagination />
          </div>
        )}
      </MobileContent>
    </div>
  );
};

const exporter: Exporter<Contact> = async (records, fetchRelatedRecords) => {
  const companies = await fetchRelatedRecords<Company>(
    records,
    "company_id",
    "companies",
  );
  const members = await fetchRelatedRecords<Member>(records, "member_id", "members");
  const tags = await fetchRelatedRecords<Tag>(records, "tags", "tags");

  const contacts = records.map((contact) => {
    const exportedContact = {
      ...contact,
      company:
        contact.company_id != null
          ? companies[contact.company_id].name
          : undefined,
      member: `${members[contact.member_id].first_name} ${
        members[contact.member_id].last_name
      }`,
      tags: contact.tags.map((tagId) => tags[tagId].name).join(", "),
      lifecycle_stage: contact.lifecycle_stage,
      lead_source: contact.lead_source,
      date_of_birth: contact.date_of_birth,
      id_number: contact.id_number,
      email_work: contact.email_jsonb?.find((email) => email.type === "Work")
        ?.email,
      email_home: contact.email_jsonb?.find((email) => email.type === "Home")
        ?.email,
      email_other: contact.email_jsonb?.find((email) => email.type === "Other")
        ?.email,
      email_jsonb: JSON.stringify(contact.email_jsonb),
      email_fts: undefined,
      phone_work: contact.phone_jsonb?.find((phone) => phone.type === "Work")
        ?.phone,
      phone_home: contact.phone_jsonb?.find((phone) => phone.type === "Home")
        ?.phone,
      phone_other: contact.phone_jsonb?.find((phone) => phone.type === "Other")
        ?.phone,
      phone_jsonb: JSON.stringify(contact.phone_jsonb),
      phone_fts: undefined,
    };
    delete exportedContact.email_fts;
    delete exportedContact.phone_fts;
    return exportedContact;
  });
  return jsonExport(contacts, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "contacts");
  });
};
