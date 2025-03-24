import { db } from "@/server/db";
import { eq, and, ilike, SQL, sql, asc, desc, or } from "drizzle-orm";
import { rankingItemAttributesTable, rankingItemsTable } from "@/server/db/schema";
import { PaginatedResults, RankingItemSoryBy } from "@/types/rankings";
import { getRankings } from "./get-rankings";
import { getRankingAttributes } from "./get-ranking-attributes";

const getSortBy = (sortBy: string): SQL => {
    switch (sortBy) {
        case RankingItemSoryBy.DESCRIPTION:
            return asc(rankingItemsTable.description);
        case RankingItemSoryBy.AVERAGE_RANKING:
            return desc(rankingItemsTable.averageRanking);
        default:
            return desc(rankingItemsTable.createdDate);
    }
};

export const getItems = async (
    groupId: string,
    page: number,
    keyword: string,
    sortBy: string
): Promise<PaginatedResults> => {
    const pageSize = 20;
    const filters: SQL[] = [eq(rankingItemsTable.groupId, groupId)];

    if (keyword) {
        const keywordFilter = or(
            ilike(rankingItemsTable.description, `%${keyword}%`),
            ilike(rankingItemAttributesTable.attributeValue, `%${keyword}%`)
        );
        if (keywordFilter) {
            filters.push(keywordFilter);
        }
    }

    const [{ count }] = await db
        .select({ count: sql<number>`count(distinct(ranking_items.id))` })
        .from(rankingItemsTable)
        .leftJoin(
            rankingItemAttributesTable,
            eq(rankingItemsTable.id, rankingItemAttributesTable.itemId)
        )
        .where(and(...filters));

    const offset = (page - 1) * pageSize;
    const items = await db
        .select({
            id: rankingItemsTable.id,
            groupId: rankingItemsTable.groupId,
            description: rankingItemsTable.description,
            ranked: rankingItemsTable.ranked,
            averageRanking: rankingItemsTable.averageRanking,
            imageId: rankingItemsTable.imageId,
            imageUrl: rankingItemsTable.imageUrl,
            createdDate: rankingItemsTable.createdDate
        })
        .from(rankingItemsTable)
        .leftJoin(
            rankingItemAttributesTable,
            eq(rankingItemsTable.id, rankingItemAttributesTable.itemId)
        )
        .where(and(...filters))
        .limit(pageSize)
        .orderBy(getSortBy(sortBy), asc(rankingItemsTable.id))
        .groupBy(
            rankingItemsTable.id,
            rankingItemsTable.groupId,
            rankingItemsTable.description,
            rankingItemsTable.ranked,
            rankingItemsTable.averageRanking,
            rankingItemsTable.imageId,
            rankingItemsTable.imageUrl,
            rankingItemsTable.createdDate
        )
        .offset(offset);

    return {
        items: await Promise.all(items.map(async (item) => ({
            id: item.id,
            groupId: item.groupId,
            description: item.description,
            ranked: item.ranked,
            averageRanking: item.averageRanking ? parseFloat(item.averageRanking) : null,
            imageId: item.imageId,
            imageUrl: item.imageUrl,
            rankings: await getRankings(item.id),
            attributes: await getRankingAttributes(item.id),
            createdDate: item.createdDate
        }))),
        total: count,
        pageSize
    };
};

