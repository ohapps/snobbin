'use server';

import { db } from "@/server/db";
import { snobGroupInvitesTable } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { logAndReturnError } from "../../utils/log-and-return-error";
import { SnobGroupInvite } from "@/types/snobGroup";
import { getGroupForCurrentUser } from "@/server/utils/group/get-group-for-current-user";

export const deleteGroupInvite = async (invite: SnobGroupInvite) => {
    try {
        await getGroupForCurrentUser(invite.groupId);

        const invites = await db.delete(snobGroupInvitesTable)
            .where(
                and(
                    eq(snobGroupInvitesTable.groupId, invite.groupId),
                    eq(snobGroupInvitesTable.id, invite.id)
                )
            ).returning();

        if (invites.length === 0) {
            return { success: false, message: 'group invite not found' };
        }

        return { success: true };
    } catch (error) {
        return logAndReturnError('error deleting group invite', error);
    }
};