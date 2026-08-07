import { getRankings } from "./get-rankings";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const calcuateAverageRanking = async (
  itemId: string,
  rankingsRequired: number,
) => {
  const rankings = await getRankings(itemId);

  if (rankings.length === 0) {
    await db
      .update(rankingItemsTable)
      .set({
        averageRanking: null,
        ranked: false,
        updatedDate: new Date(),
      })
      .where(eq(rankingItemsTable.id, itemId));
    return;
  }

  const totalRanking = rankings.reduce(
    (acc, ranking) => acc + ranking.ranking,
    0,
  );
  const averageRanking = totalRanking / rankings.length;

  // TODO: round to nearest increment

  await db
    .update(rankingItemsTable)
    .set({
      averageRanking: averageRanking.toString(),
      ranked: rankings.length >= rankingsRequired,
      updatedDate: new Date(),
    })
    .where(eq(rankingItemsTable.id, itemId));
};
