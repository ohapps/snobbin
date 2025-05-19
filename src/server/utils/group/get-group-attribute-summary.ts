import { db } from "@/server/db";
import {
  rankingItemAttributesTable,
  rankingItemsTable,
} from "@/server/db/schema";
import { SnobGroup, SnobGroupAttributeSummary } from "@/types/snobGroup";
import { eq, count } from "drizzle-orm";

export const getGroupAttributeSummary = async (
  group: SnobGroup,
): Promise<SnobGroupAttributeSummary[]> => {
  return db
    .select({
      attributeId: rankingItemAttributesTable.attributeId,
      attributeValue: rankingItemAttributesTable.attributeValue,
      count: count(rankingItemAttributesTable.id).as("count"),
    })
    .from(rankingItemsTable)
    .innerJoin(
      rankingItemAttributesTable,
      eq(rankingItemsTable.id, rankingItemAttributesTable.itemId),
    )
    .where(eq(rankingItemsTable.groupId, group.id ?? ""))
    .groupBy(
      rankingItemAttributesTable.attributeId,
      rankingItemAttributesTable.attributeValue,
    )
    .orderBy(
      rankingItemAttributesTable.attributeId,
      rankingItemAttributesTable.attributeValue,
    );
};
