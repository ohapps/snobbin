import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { RankingItem } from "@/types/rankings";
import { eq } from "drizzle-orm";

export const getItem = async (itemId: string): Promise<RankingItem> => {
    const items = await db.select().from(rankingItemsTable).where(eq(rankingItemsTable.id, itemId));

    if (!items || items.length === 0) {
        throw new Error('Ranking item not found');
    }

    return items[0] as unknown as RankingItem;
}