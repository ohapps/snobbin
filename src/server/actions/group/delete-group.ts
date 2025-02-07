'use server';

import { ActionResponse } from "@/types/actions";
import { SnobGroupRole } from "@/types/snobGroup";
import { getCurrentUser } from "../../utils/user/get-current-user";
import { db } from "@/server/db";
import { snobGroupsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getGroupForUser } from "@/server/utils/group/get-group-for-user";
import { logAndReturnError } from "@/server/utils/log-and-return-error";

export const deleteGroup = async (snobGroupId: string): Promise<ActionResponse> => {
    try {
        const snob = await getCurrentUser();

        await getGroupForUser(snobGroupId, snob.id, [SnobGroupRole.ADMIN]);

        await db.update(snobGroupsTable)
            .set({ deleted: true })
            .where(eq(snobGroupsTable.id, snobGroupId));

        return { success: true };
    } catch (error) {
        return logAndReturnError('failed to delete group', error);
    }
}