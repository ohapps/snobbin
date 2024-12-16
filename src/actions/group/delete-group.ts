'use server';

import { ActionResponse } from "@/types/actions";
import { SnobGroupRole } from "@/types/snobGroup";
import { getGroupForUser } from "./get-group-for-user";
import { getCurrentUser } from "../user/get-current-user";
import { db } from "@/db";
import { snobGroupsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const deleteGroup = async (snobGroupId: string): Promise<ActionResponse> => {
    try {
        const snob = await getCurrentUser();

        await getGroupForUser(snobGroupId, snob.id, [SnobGroupRole.ADMIN]);

        await db.update(snobGroupsTable)
            .set({ deleted: true })
            .where(eq(snobGroupsTable.id, snobGroupId));

        return { success: true };
    } catch (error) {
        console.error('failed to delete group', error);
        return { success: false, message: 'failed to delete group' };
    }
}