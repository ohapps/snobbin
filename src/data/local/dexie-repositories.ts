/**
 * Dexie-based repositories as fallback when SQLite fails.
 */

import { getDexieDb } from "./dexie-db";
import { getOfflineDbName } from "./identity";
import { getRememberedSnobId } from "./identity";
import type { SnobGroup, SnobGroupAttributeSummary, SnobGroupInvite, SnobGroupMember } from "@/types/snobGroup";
import type { PaginatedResults, RankingItem, RankingItemSoryBy, RecentRankingItem } from "@/types/rankings";
import type { Snob } from "@/types/snob";
import type { GroupSyncState } from "./repositories";

const PAGE_SIZE = 20;

export async function localDataAvailableDexie(): Promise<boolean> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const count = await db.groups.count();
  return count > 0;
}

export async function getAllGroupSyncStatesDexie(): Promise<
  Array<GroupSyncState & { groupId: string }>
> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const rows = await db.sync_meta.toArray();
  return rows
    .map((row) => ({
      groupId: row.groupId,
      complete: row.complete,
      highestPageSynced: row.highestPageSynced,
      totalItems: row.totalItems ?? null,
      lastSyncedAt: row.lastSyncedAt ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.lastSyncedAt ? Date.parse(a.lastSyncedAt) : 0;
      const bTime = b.lastSyncedAt ? Date.parse(b.lastSyncedAt) : 0;
      return bTime - aTime;
    });
}

function toSnob(row: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
  lastGroupId: string | null;
  isPremium: boolean;
}): Snob {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    pictureUrl: row.pictureUrl,
    lastGroupId: row.lastGroupId,
    isPremium: row.isPremium,
  };
}

export async function getLocalGroupsDexie(): Promise<SnobGroup[]> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  if (!snobId) return [];

  const [groups, memberRows] = await Promise.all([
    db.groups.toArray(),
    db.group_members.where("snobId").equals(snobId).toArray(),
  ]);

  const activeGroupIds = new Set(
    memberRows.filter((m) => m.role !== "DISABLED").map((m) => m.groupId),
  );

  const result: SnobGroup[] = [];
  for (const g of groups.filter((g) => !g.deleted && activeGroupIds.has(g.id))) {
    const members = await db.group_members.where("groupId").equals(g.id).toArray();
    const snobIds = members.map((m) => m.snobId);
    const snobs = await db.snobs.where("id").anyOf(snobIds).toArray();
    const snobMap = new Map(snobs.map((s) => [s.id, toSnob(s)]));
    const groupMembers: SnobGroupMember[] = members.map((m) => {
      const snob = snobMap.get(m.snobId);
      if (!snob) throw new Error("Missing snob");
      return {
        id: m.id,
        snobId: m.snobId,
        groupId: m.groupId,
        role: m.role as SnobGroupMember["role"],
        snob,
      };
    });
    result.push({
      id: g.id,
      name: g.name,
      description: g.description,
      minRanking: g.minRanking,
      maxRanking: g.maxRanking,
      increments: g.increments,
      rankIcon: g.rankIcon,
      rankingsRequired: g.rankingsRequired,
      pictureUrl: g.pictureUrl ?? undefined,
      members: groupMembers,
    } as SnobGroup);
  }
  return result;
}

export async function getLocalCurrentUserDexie(): Promise<Snob | null> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  if (!snobId) return null;
  const snob = await db.snobs.get(snobId);
  if (!snob) return null;
  return toSnob(snob);
}

export async function getLocalGroupForCurrentUserDexie(groupId: string): Promise<SnobGroup | null> {
  const groups = await getLocalGroupsDexie();
  return groups.find((g) => g.id === groupId) ?? null;
}

export async function getLocalGroupInvitesDexie(): Promise<SnobGroupInvite[]> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  if (!snobId) return [];
  const snob = await db.snobs.get(snobId);
  if (!snob?.email) return [];
  const invites = await db.group_invites.where("email").equals(snob.email).toArray();
  const result: SnobGroupInvite[] = [];
  for (const inv of invites) {
    const group = await db.groups.get(inv.groupId);
    if (!group) continue;
    result.push({
      id: inv.id,
      groupId: inv.groupId,
      email: inv.email,
      status: inv.status as SnobGroupInvite["status"],
      groupName: group.name,
    });
  }
  return result;
}

export async function getLocalGroupAttributeSummaryDexie(
  groupId: string,
): Promise<SnobGroupAttributeSummary[]> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const attributes = await db.group_attributes.where("groupId").equals(groupId).toArray();
  const result: SnobGroupAttributeSummary[] = [];
  for (const attr of attributes) {
    const values = await db.item_attributes.where("attributeId").equals(attr.id).toArray();
    const valueSet = new Set(
      values.map((v) => v.attributeValue).filter((v): v is string => Boolean(v)),
    );
    for (const v of Array.from(valueSet)) {
      result.push({ attributeId: attr.id, attributeValue: v, count: values.filter((x) => x.attributeValue === v).length });
    }
  }
  return result;
}

export async function getLocalItemsDexie(
  groupId: string,
  options: {
    page?: number;
    sortBy?: RankingItemSoryBy;
    rankedStatus?: "all" | "ranked" | "unranked";
    keyword?: string;
    attributeFilters?: Record<string, string[]>;
  } = {},
): Promise<PaginatedResults<RankingItem>> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const page = options.page ?? 1;
  const keyword = options.keyword?.trim().toLowerCase();

  let items = await db.items.where("groupId").equals(groupId).toArray();

  if (options.rankedStatus === "ranked") {
    items = items.filter((i) => i.ranked);
  } else if (options.rankedStatus === "unranked") {
    items = items.filter((i) => !i.ranked);
  }

  if (keyword) {
    items = items.filter((i) => (i.description || "").toLowerCase().includes(keyword));
  }

  const total = items.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginatedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const results: RankingItem[] = [];
  for (const item of paginatedItems) {
    const rankings = await db.rankings.where("itemId").equals(item.id).toArray();
    const itemAttrs = await db.item_attributes.where("itemId").equals(item.id).toArray();
    const attributeMap = new Map<string, string>();
    for (const ia of itemAttrs) {
      const attr = await db.group_attributes.get(ia.attributeId);
      if (attr) attributeMap.set(attr.name, ia.attributeValue);
    }
    const members = await db.group_members.where("groupId").equals(groupId).toArray();
    const memberSnobs = new Map<string, Snob>();
    for (const m of members) {
      const s = await db.snobs.get(m.snobId);
      if (s) memberSnobs.set(m.id, toSnob(s));
    }
    const rankingItems = rankings
      .map((r) => {
        const snob = memberSnobs.get(r.groupMemberId);
        if (!snob) return null;
        return {
          id: r.id,
          ranking: r.ranking,
          notes: r.notes,
          snob,
          createdDate: r.createdDate ? new Date(r.createdDate) : new Date(),
          updatedDate: r.updatedDate ? new Date(r.updatedDate) : new Date(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    results.push({
      id: item.id,
      description: item.description,
      averageRanking: item.averageRanking ?? null,
      rankings: rankingItems,
      ranked: item.ranked,
      attributes: attributeMap,
      imageUrl: item.imageUrl ?? null,
      imageId: item.imageId ?? null,
      createdDate: item.createdDate ? new Date(item.createdDate) : new Date(),
      updatedDate: item.updatedDate ? new Date(item.updatedDate) : new Date(),
      createdBySnob: null,
      updatedBySnob: null,
    } as RankingItem);
  }
  return {
    data: results,
    total,
    currentPage: page,
    totalPages,
  };
}

export async function getLocalRecentRankingsDexie(limit = 10): Promise<RecentRankingItem[]> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  if (!snobId) return [];
  const snob = await db.snobs.get(snobId);
  if (!snob) return [];
  const memberRows = await db.group_members.where("snobId").equals(snobId).toArray();
  const memberIds = new Set(memberRows.map((m) => m.id));
  const allRankings = await db.rankings.toArray();
  const userRankings = allRankings
    .filter((r) => memberIds.has(r.groupMemberId))
    .sort((a, b) => {
      const ad = a.updatedDate || a.createdDate || "";
      const bd = b.updatedDate || b.createdDate || "";
      return bd.localeCompare(ad);
    })
    .slice(0, limit);
  const results: RecentRankingItem[] = [];
  for (const r of userRankings) {
    const item = await db.items.get(r.itemId);
    if (!item) continue;
    const group = await db.groups.get(item.groupId);
    if (!group) continue;
    results.push({
      id: r.id,
      ranking: r.ranking,
      notes: r.notes,
      item: {
        id: item.id,
        description: item.description,
        imageUrl: item.imageUrl ?? undefined,
      } as RecentRankingItem["item"],
      group: { id: group.id, name: group.name } as RecentRankingItem["group"],
      createdDate: r.createdDate ? new Date(r.createdDate) : new Date(),
      updatedDate: r.updatedDate ? new Date(r.updatedDate) : new Date(),
    });
  }
  return results;
}
