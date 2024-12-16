'use server';

import { ActionResponse } from "@/types/actions";
import { logAndReturnError } from "../utils/log-and-return-error";
import { getPendingInvites } from "./get-pending-invites";
import { snobGroupInvitesTable, snobGroupMembersTable } from "@/db/schema";
import { db } from "@/db";
import { generateNewId } from "@/utils/generate-new-id";
import { GroupInviteStatus, SnobGroupRole } from "@/types/snobGroup";
import { getCurrentUser } from "../user/get-current-user";
import { eq } from "drizzle-orm";

export const acceptGroupInvite = async (inivteId: string): Promise<ActionResponse> => {
    try {
        const invites = await getPendingInvites();
        const invite = invites.find((invite) => invite.id === inivteId);

        if (!invite) {
            return { success: false, message: 'invite not found' };
        }

        const snob = await getCurrentUser();

        await db.insert(snobGroupMembersTable).values({
            id: generateNewId(),
            groupId: invite.groupId,
            snobId: snob.id,
            role: SnobGroupRole.MEMBER
        });

        await db.update(snobGroupInvitesTable)
            .set({
                status: GroupInviteStatus.ACCEPTED
            })
            .where(eq(snobGroupInvitesTable.id, invite.id));

        return { success: true };
    } catch (error) {
        return logAndReturnError('error accepting group invite', error);
    }
}