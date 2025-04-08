import { Ranking } from "@/types/rankings";
import { SnobGroup } from "@/types/snobGroup";

export const getGroupMemberForRanking = (
  group: SnobGroup,
  ranking: Ranking,
) => {
  return group.members.find((member) => member.id === ranking.groupMemberId);
};
