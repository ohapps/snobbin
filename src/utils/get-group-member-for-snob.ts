import { Snob } from "@/types/snob";
import { SnobGroup, SnobGroupMember } from "@/types/snobGroup";

export const getGroupMemberForSnob = (
  group: SnobGroup,
  snob: Snob,
): SnobGroupMember => {
  const groupMember = group.members.find(
    (member) => member.snob.id === snob.id,
  );
  if (!groupMember) {
    throw new Error(`Group member not found for snob ${snob.id}`);
  }
  return groupMember;
};
