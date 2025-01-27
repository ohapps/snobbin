'use server';

import { ActionResponse } from "@/types/actions";
import { logAndReturnError } from "../utils/log-and-return-error";
import { getItem } from "./get-item";
import { getCurrentUser } from "../user/get-current-user";
import { SnobGroupRole } from "@/types/snobGroup";
import { getGroupForUser } from "../group/get-group-for-user";
import { db } from "@/db";
import { rankingItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const deleteItem = async (itemId: string): Promise<ActionResponse> => {
    try {
        const snob = await getCurrentUser();
        const rankingItem = await getItem(itemId);

        await getGroupForUser(rankingItem.groupId, snob.id, [SnobGroupRole.ADMIN]);

        await db.delete(rankingItemsTable).where(eq(rankingItemsTable.id, itemId));

        return { success: true };
    } catch (error) {
        return logAndReturnError('failed to delete ranking item', error);
    }
}