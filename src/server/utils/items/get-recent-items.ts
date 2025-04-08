import { db } from "@/server/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { getCurrentUser } from "../user/get-current-user";
import {
  rankingItemsTable,
  snobGroupMembersTable,
  snobGroupsTable,
} from "@/server/db/schema";
import { RecentRankingItem } from "@/types/rankings";

export const getRecentItems = async (): Promise<RecentRankingItem[]> => {
  const snob = await getCurrentUser();
  const fiveDaysAgo = new Date(new Date().setDate(new Date().getDate() - 5));
  const items = await db
    .select()
    .from(rankingItemsTable)
    .innerJoin(
      snobGroupsTable,
      eq(snobGroupsTable.id, rankingItemsTable.groupId),
    )
    .innerJoin(
      snobGroupMembersTable,
      eq(snobGroupMembersTable.groupId, snobGroupsTable.id),
    )
    .where(
      and(
        eq(snobGroupMembersTable.snobId, snob.id),
        gt(rankingItemsTable.createdDate, fiveDaysAgo),
      ),
    )
    .orderBy(desc(rankingItemsTable.createdDate))
    .limit(5);
  return items.map((item) => {
    return {
      id: item.ranking_items.id,
      groupId: item.ranking_items.groupId,
      groupName: item.snob_groups.name,
      description: item.ranking_items.description,
      createdDate: item.ranking_items.createdDate,
    };
  });
};
