import { db } from "@/server/db";
import { snobGroupMembersTable, snobGroupsTable } from "@/server/db/schema";
import { AccessDeniedError } from "@/types/errors";
import { SnobGroupRole } from "@/types/snobGroup";
import { eq, and, inArray } from "drizzle-orm";
import { convertGroupEntityToModel } from "./convert-group-entity-to-model";

export const getGroupForUser = async (groupId: string, snobId: string, roles: SnobGroupRole[]) => {
    const group = await db.select().from(snobGroupsTable)
        .leftJoin(snobGroupMembersTable, eq(snobGroupsTable.id, snobGroupMembersTable.groupId))
        .where(
            and(
                eq(snobGroupsTable.id, groupId),
                eq(snobGroupMembersTable.snobId, snobId),
                inArray(snobGroupMembersTable.role, roles),
                eq(snobGroupsTable.deleted, false)
            )
        );

    if (!group || group.length === 0) {
        throw new AccessDeniedError('You do not have access to this group');
    }

    return convertGroupEntityToModel(group[0].snob_groups);
}