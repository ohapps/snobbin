'use server';

import { ActionResponse } from "@/types/actions";
import { logAndReturnError } from "../utils/log-and-return-error";
import { getPendingInvites } from "./get-pending-invites";
import { snobGroupInvitesTable } from "@/db/schema";
import { db } from "@/db";
import { GroupInviteStatus } from "@/types/snobGroup";
import { eq } from "drizzle-orm";

export const declineGroupInvite = async (inivteId: string): Promise<ActionResponse> => {
    try {
        const invites = await getPendingInvites();
        const invite = invites.find((invite) => invite.id === inivteId);

        if (!invite) {
            return { success: false, message: 'invite not found' };
        }

        await db.update(snobGroupInvitesTable)
            .set({
                status: GroupInviteStatus.REJECTED
            })
            .where(eq(snobGroupInvitesTable.id, invite.id));

        return { success: true };
    } catch (error) {
        return logAndReturnError('error declining group invite', error);
    }
}