import { db } from "@/server/db";
import { eq, and, ilike, SQL, sql, asc, desc } from "drizzle-orm";
import { rankingItemsTable } from "@/server/db/schema";
import { PaginatedResults, RankingItemSortDirection, RankingItemSoryBy } from "@/types/rankings";
import { getRankings } from "./get-rankings";
import { getRankingAttributes } from "./get-ranking-attributes";

const getSortBy = (sortBy: string, sortDirection: string) => {
    if (sortBy === RankingItemSoryBy.DESCRIPTION) {
        return sortDirection === RankingItemSortDirection.ASC ? asc(rankingItemsTable.description) : desc(rankingItemsTable.description);
    }

    if (sortBy === RankingItemSoryBy.AVERAGE_RANKING) {
        return sortDirection === RankingItemSortDirection.ASC ? asc(rankingItemsTable.averageRanking) : desc(rankingItemsTable.averageRanking);
    }

    return asc(rankingItemsTable.description);
}

export const getItems = async (
    groupId: string,
    page: number,
    keyword: string,
    sortBy: string,
    sortDirection: string
): Promise<PaginatedResults> => {
    const pageSize = 20;
    const filters: SQL[] = [eq(rankingItemsTable.groupId, groupId)];

    if (keyword) {
        filters.push(ilike(rankingItemsTable.description, `%${keyword}%`));
    }

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rankingItemsTable)
        .where(and(...filters));

    const offset = (page - 1) * pageSize;
    const items = await db
        .select()
        .from(rankingItemsTable)
        .where(and(...filters))
        .limit(pageSize)
        .orderBy(getSortBy(sortBy, sortDirection), asc(rankingItemsTable.id))
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
            attributes: await getRankingAttributes(item.id)
        }))),
        total: count,
        pageSize
    };
};

