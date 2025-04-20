import { z } from "zod";

export const RankingSchema = z.object({
  id: z.string().uuid().optional(),
  itemId: z.string().uuid(),
  ranking: z.number().min(0, "ranking must be greater than or equal to 0"),
  notes: z
    .string()
    .max(500, "notes must be less than or equal to 500 characters")
    .optional(),
});

export type RankingUpdate = z.infer<typeof RankingSchema>;

export type Ranking = {
  id: string;
  itemId: string;
  groupMemberId: string;
  ranking: number;
  notes: string | null;
};

export const RankingItemSchema = z.object({
  id: z.string().optional(),
  groupId: z.string().uuid(),
  description: z
    .string()
    .min(1, "description is required")
    .max(100, "description must be less than or equal to 100 characters"),
  imageId: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export type RankItemUpdate = z.infer<typeof RankingItemSchema>;

export type RankingItemAttribute = {
  id: string;
  attributeId: string;
  attributeValue: string;
};

export type RankingItem = {
  id: string;
  groupId: string;
  description: string;
  ranked: boolean;
  averageRanking: number | null;
  imageId: string | null;
  imageUrl: string | null;
  createdDate: Date | null;
  rankings: Ranking[];
  attributes: RankingItemAttribute[];
};

export type RecentRankingItem = {
  id: string;
  groupId: string;
  groupName: string;
  description: string;
  createdDate: Date;
};

export const defaultNewRankingItem: RankingItem = {
  id: "",
  groupId: "",
  description: "",
  averageRanking: 0,
  ranked: false,
  imageId: null,
  imageUrl: null,
  createdDate: null,
  rankings: [],
  attributes: [],
};

export enum RankingItemSoryBy {
  DESCRIPTION = "DESCRIPTION",
  RANKING = "RANKING",
  MOST_RECENT = "MOST_RECENT",
}

export interface PaginatedResults {
  items: RankingItem[];
  total: number;
  pageSize: number;
}
