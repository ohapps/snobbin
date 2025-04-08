import { getRankings } from "./get-rankings";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { SnobGroup } from "@/types/snobGroup";
import { eq } from "drizzle-orm";

export const calcuateAverageRanking = async (
  itemId: string,
  snobGroup: SnobGroup,
) => {
  const rankings = await getRankings(itemId);
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
      ranked: rankings.length >= snobGroup.rankingsRequired,
    })
    .where(eq(rankingItemsTable.id, itemId));
};
