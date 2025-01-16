'use server';

import { ActionResponse } from "@/types/actions";
import { RankingItem, RankingItemSchema } from "@/types/rankings";
import { logAndReturnError } from "../utils/log-and-return-error";
import { getGroupForCurrentUser } from "../group/get-group-for-current-user";
import { db } from "@/db";
import { rankingItemsTable } from "@/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { eq } from "drizzle-orm";

export const saveItem = async (item: RankingItem): Promise<ActionResponse> => {
    try {
        const validatedData = RankingItemSchema.safeParse(item);

        if (!validatedData.success) {
            return logAndReturnError('error parsing ranking item data', validatedData.error);
        }

        await getGroupForCurrentUser(item.groupId);

        if (validatedData.data.id) {
            await db.update(rankingItemsTable)
                .set({
                    description: item.description
                })
                .where(eq(rankingItemsTable.id, item.id));
        } else {
            await db.insert(rankingItemsTable).values({
                id: generateNewId(),
                groupId: item.groupId,
                description: item.description,
                ranked: false
            });
        }

        return { success: true };
    } catch (error) {
        return logAndReturnError('error saving ranking item', error);
    }
}