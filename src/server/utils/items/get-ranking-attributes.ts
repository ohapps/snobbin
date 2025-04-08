import { db } from "@/server/db";
import { rankingItemAttributesTable } from "@/server/db/schema";
import { RankingItemAttribute } from "@/types/rankings";
import { eq } from "drizzle-orm";

export const getRankingAttributes = async (
  itemId: string,
): Promise<RankingItemAttribute[]> => {
  const attributes = await db
    .select()
    .from(rankingItemAttributesTable)
    .where(eq(rankingItemAttributesTable.itemId, itemId));

  return attributes.map(
    (attribute) =>
      ({
        id: attribute.id,
        itemId: attribute.itemId,
        attributeId: attribute.attributeId,
        attributeValue: attribute.attributeValue,
      }) as RankingItemAttribute,
  );
};
