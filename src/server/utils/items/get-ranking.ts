import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { rankingsTable } from "@/server/db/schema";
import { Ranking } from "@/types/rankings";

export const getRanking = async (rankingId: string): Promise<Ranking> => {
    const rankings = await db.select().from(rankingsTable).where(eq(rankingsTable.id, rankingId));
    return {
        ...rankings[0],
        ranking: +rankings[0].ranking
    } as Ranking;
}