import { db } from "@/server/db";
import { eq, asc } from "drizzle-orm";
import { rankingsTable } from "@/server/db/schema";
import { Ranking } from "@/types/rankings";

export const getRankings = async (itemId: string): Promise<Ranking[]> => {
    const rankings = await db
        .select()
        .from(rankingsTable)
        .where(eq(rankingsTable.itemId, itemId))
        .orderBy(asc(rankingsTable.id));

    return rankings.map((ranking) => ({
        id: ranking.id,
        itemId: ranking.itemId,
        groupMemberId: ranking.groupMemberId,
        ranking: +ranking.ranking,
        notes: ranking.notes
    } as Ranking));
}