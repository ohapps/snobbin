import { SnobGroup } from "@/types/snobGroup";
import { getGroupMembers } from "./get-group-members";
import { SelectSnobGroup } from "@/db/schema";
import { getGroupInvites } from "./get-group-invites";
import { getGroupAttributes } from "./get-group-attributes";

export const convertGroupEntityToModel = async (group: SelectSnobGroup): Promise<SnobGroup> => {
    const members = group.id ? await getGroupMembers(group.id) : [];
    const invites = group.id ? await getGroupInvites(group) : [];
    const attributes = group.id ? await getGroupAttributes(group) : [];
    return {
        ...group,
        minRanking: Number(group.minRanking),
        maxRanking: Number(group.maxRanking),
        increments: Number(group.increments),
        rankingsRequired: Number(group.rankingsRequired),
        members,
        invites,
        attributes
    }
}