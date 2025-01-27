'use server';

import { ActionResponse } from "@/types/actions";
import { RankingItem, RankingItemSchema, RankItemUpdate } from "@/types/rankings";
import { logAndReturnError } from "../utils/log-and-return-error";
import { getGroupForCurrentUser } from "../group/get-group-for-current-user";
import { db } from "@/db";
import { rankingItemAttributesTable, rankingItemsTable } from "@/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { eq } from "drizzle-orm";

const createOrUpdateRankingItem = async (item: RankItemUpdate): Promise<string> => {
    if (item.id) {
        await db.update(rankingItemsTable)
            .set({
                description: item.description,
                imageId: item.imageId,
                imageUrl: item.imageUrl,
            })
            .where(eq(rankingItemsTable.id, item.id));
        return item.id;
    } else {
        const id = generateNewId();
        await db.insert(rankingItemsTable).values({
            id,
            groupId: item.groupId,
            description: item.description,
            imageId: item.imageId,
            imageUrl: item.imageUrl,
            ranked: false
        });
        return id;
    }
}

export const saveItem = async (item: RankingItem): Promise<ActionResponse> => {
    try {
        const validatedData = RankingItemSchema.safeParse(item);

        if (!validatedData.success) {
            return logAndReturnError('error parsing ranking item data', validatedData.error);
        }

        await getGroupForCurrentUser(item.groupId);

        const itemId = await createOrUpdateRankingItem(validatedData.data);

        item.attributes.forEach(async (attribute) => {
            if (!attribute.id) {
                await db.insert(rankingItemAttributesTable).values({
                    id: generateNewId(),
                    itemId,
                    attributeId: attribute.attributeId,
                    attributeValue: attribute.attributeValue
                });
            } else {
                await db.update(rankingItemAttributesTable)
                    .set({ attributeValue: attribute.attributeValue })
                    .where(eq(rankingItemAttributesTable.id, attribute.id));
            }
        });

        return { success: true };
    } catch (error) {
        return logAndReturnError('error saving ranking item', error);
    }
}