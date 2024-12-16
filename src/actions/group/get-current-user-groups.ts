import { db } from "@/db";
import { snobGroupMembersTable, snobGroupsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "../user/get-current-user";
import { SnobGroup } from "@/types/snobGroup";
import { getGroupMembers } from "./get-group-members";
import { convertGroupEntityToModel } from "./convert-group-entity-to-model";

export const getCurrentUserGroups = async (): Promise<SnobGroup[]> => {
    const snob = await getCurrentUser();

    const groups = await db.selectDistinct({
        id: snobGroupsTable.id,
        name: snobGroupsTable.name,
        description: snobGroupsTable.description,
        rankIcon: snobGroupsTable.rankIcon,
        minRanking: snobGroupsTable.minRanking,
        maxRanking: snobGroupsTable.maxRanking,
        increments: snobGroupsTable.increments,
        rankingsRequired: snobGroupsTable.rankingsRequired,
        deleted: snobGroupsTable.deleted
    }).from(snobGroupsTable)
        .leftJoin(snobGroupMembersTable, eq(snobGroupsTable.id, snobGroupMembersTable.groupId))
        .where(and(eq(snobGroupMembersTable.snobId, snob.id), eq(snobGroupsTable.deleted, false)));

    return Promise.all(groups.map(async (group) => convertGroupEntityToModel(group)));
}