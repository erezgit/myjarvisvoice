import type { Member } from "../types";
import { MembersCreate } from "./MembersCreate";
import { MembersEdit } from "./MembersEdit";
import { MembersList } from "./MembersList";

export default {
  list: MembersList,
  create: MembersCreate,
  edit: MembersEdit,
  recordRepresentation: (record: Member) =>
    `${record.first_name} ${record.last_name}`,
};
