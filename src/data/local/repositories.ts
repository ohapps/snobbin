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
    return await getAllGroupSyncStatesDexie();
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
    // The UI sends "pending"; the server treats any non-"ranked" status as unranked.
    else if (status === "pending" || status === "unranked")
      rankedStatus = "unranked";
    const res = await getLocalItemsDexie(groupId, {
      page,
      sortBy: sortBy as RankingItemSoryBy,
      rankedStatus,
      keyword,
      attributeFilters,
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
