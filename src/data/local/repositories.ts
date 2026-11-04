/**
 * Read-side repositories over the local IndexedDB mirror (Dexie).
 */

import {
  getLocalGroupsDexie,
  getLocalCurrentUserDexie,
  getAllGroupSyncStatesDexie,
  localDataAvailableDexie,
} from "./dexie-repositories";
import type {
  SnobGroup,
  SnobGroupAttributeSummary,
  SnobGroupInvite,
} from "@/types/snobGroup";
import type {
  PaginatedResults,
  RankingItemSoryBy,
  RecentRankingItem,
} from "@/types/rankings";
import type { Snob } from "@/types/snob";

/** True when the user has any mirrored data at all. */
export async function localDataAvailable(): Promise<boolean> {
  try {
    return await localDataAvailableDexie();
  } catch {
    return false;
  }
}

export interface GroupSyncState {
  complete: boolean;
  highestPageSynced: number;
  totalItems: number | null;
  lastSyncedAt: string | null;
}

export async function getGroupSyncState(
  groupId: string,
): Promise<GroupSyncState | null> {
  try {
    const { getGroupSyncStateDexie } = await import("./dexie-repositories");
    return await getGroupSyncStateDexie(groupId);
  } catch {
    return null;
  }
}

export async function getAllGroupSyncStates(): Promise<
  Array<
    GroupSyncState & {
      groupId: string;
    }
  >
> {
  try {
    const states = await getAllGroupSyncStatesDexie();
    if (states.length === 0) {
      try {
        const { getDexieDb } = await import("./dexie-db");
        const anonDb = getDexieDb("snobbin-offline-anonymous.db");
        const rows = await anonDb.sync_meta.toArray();
        return rows
          .map((row: any) => ({
            groupId: row.groupId,
            complete: row.complete,
            highestPageSynced: row.highestPageSynced,
            totalItems: row.totalItems ?? null,
            lastSyncedAt: row.lastSyncedAt ?? null,
          }))
          .sort((a: any, b: any) => {
            const aTime = a.lastSyncedAt ? Date.parse(a.lastSyncedAt) : 0;
            const bTime = b.lastSyncedAt ? Date.parse(b.lastSyncedAt) : 0;
            return bTime - aTime;
          });
      } catch {}
    }
    return states;
  } catch {
    return [];
  }
}

export async function getLocalGroups(): Promise<SnobGroup[]> {
  try {
    return await getLocalGroupsDexie();
  } catch {
    return [];
  }
}

/** The signed-in snob, read from the mirror. */
export async function getLocalCurrentUser(): Promise<Snob | null> {
  try {
    return await getLocalCurrentUserDexie();
  } catch {
    return null;
  }
}

/** Mirrors `getLastGroupId` for the offline landing redirect. */
export async function getLocalLastGroupId(): Promise<string | null> {
  const user = await getLocalCurrentUser();
  return user?.lastGroupId ?? null;
}

/** Mirrors `getPendingInvites` against the mirror. */
export async function getLocalPendingInvites(): Promise<SnobGroupInvite[]> {
  try {
    const { getLocalPendingInvitesDexie } = await import(
      "./dexie-repositories"
    );
    return await getLocalPendingInvitesDexie();
  } catch {
    return [];
  }
}

/** Mirrors `getRecentItems` (last 5 days, newest first, max 5). */
export async function getLocalRecentItems(): Promise<RecentRankingItem[]> {
  try {
    const { getLocalRecentRankingsDexie } = await import(
      "./dexie-repositories"
    );
    return await getLocalRecentRankingsDexie(5);
  } catch {
    return [];
  }
  return [];
}

/** Mirrors `getGroupForCurrentUser` but reads from the mirror. */
export async function getLocalGroupForCurrentUser(
  groupId: string,
): Promise<SnobGroup | null> {
  try {
    const { getLocalGroupForCurrentUserDexie } = await import(
      "./dexie-repositories"
    );
    return await getLocalGroupForCurrentUserDexie(groupId);
  } catch {
    return null;
  }
}

export async function getLocalGroupAttributeSummary(
  groupId: string,
): Promise<SnobGroupAttributeSummary[]> {
  try {
    const { getLocalGroupAttributeSummaryDexie } = await import(
      "./dexie-repositories"
    );
    return await getLocalGroupAttributeSummaryDexie(groupId);
  } catch {
    return [];
  }
}

export interface GetLocalItemsParams {
  groupId: string;
  page: number;
  keyword?: string;
  sortBy?: RankingItemSoryBy | string;
  status?: string;
  attributeFilters?: Record<string, string>;
}

/** Mirrors `getItems` against the mirror, returning `PaginatedResults`. */
export async function getLocalItems({
  groupId,
  page,
  keyword,
  sortBy,
  status,
  attributeFilters,
}: GetLocalItemsParams): Promise<PaginatedResults> {
  try {
    const { getLocalItemsDexie } = await import("./dexie-repositories");
    let rankedStatus: "all" | "ranked" | "unranked" = "all";
    if (status === "ranked") rankedStatus = "ranked";
    else if (status === "unranked") rankedStatus = "unranked";
    const res = await getLocalItemsDexie(groupId, {
      page,
      sortBy: sortBy as RankingItemSoryBy,
      rankedStatus,
      keyword,
      attributeFilters: attributeFilters as unknown as Record<string, string[]>,
    });
    return {
      items: res.data,
      total: res.total,
      pageSize: 20,
    } as PaginatedResults;
  } catch {
    return { items: [], total: 0, pageSize: 20 } as PaginatedResults;
  }
}
