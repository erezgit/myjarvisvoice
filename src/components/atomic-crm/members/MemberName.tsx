import { useGetIdentity, useRecordContext } from "ra-core";

import type { Member } from "../types";

export const MemberName = ({ member }: { member?: Member }) => {
  const { identity, isPending } = useGetIdentity();
  const memberFromContext = useRecordContext<Member>();
  const finalMember = member || memberFromContext;
  if (isPending || !finalMember) return null;
  return finalMember.id === identity?.id
    ? "You"
    : `${finalMember.first_name} ${finalMember.last_name}`;
};
