import { z } from "zod";

export const RankingSchema = z.object({
    id: z.string().uuid().optional(),
    itemId: z.string().uuid(),
    ranking: z.number().min(0, 'ranking must be greater than or equal to 0'),
    notes: z.string().max(500, 'notes must be less than or equal to 500 characters').optional(),
});

export type RankingUpdate = z.infer<typeof RankingSchema>;

export type Ranking = {
    id: string;
    itemId: string;
    groupMemberId: string;
    ranking: number;
    notes: string | null;
}

export const RankingItemSchema = z.object({
    id: z.string().optional(),
    groupId: z.string().uuid(),
    description: z.string().min(1, 'description is required').max(100, 'description must be less than or equal to 100 characters'),
    imageId: z.string().uuid().optional(),
    imageUrl: z.string().url().optional(),
});

export type RankingItem = {
    id: string;
    groupId: string;
    description: string;
    ranked: boolean;
    averageRanking: number | null;
    imageId: string | null;
    imageUrl: string | null;
    rankings: Ranking[];
}

export const defaultNewRankingItem: RankingItem = {
    id: '',
    groupId: '',
    description: '',
    averageRanking: 0,
    ranked: false,
    imageId: null,
    imageUrl: null,
    rankings: []
}

export enum RankingItemSoryBy {
    DESCRIPTION = 'DESCRIPTION',
    AVERAGE_RANKING = 'AVERAGE_RANKING'
}

export enum RankingItemSortDirection {
    ASC = 'ASC',
    DESC = 'DESC'
}

export interface PaginatedResults {
    items: RankingItem[];
    total: number;
    pageSize: number;
}