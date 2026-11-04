/**
 * Dexie-based repositories as fallback when SQLite fails.
 */

import { getDexieDb } from "./dexie-db";
import {
  getOfflineDbName,
  getRememberedSnobId,
  setRememberedSnobId,
} from "./identity";
import type {
  SnobGroup,
  SnobGroupAttributeSummary,
  SnobGroupInvite,
  SnobGroupMember,
} from "@/types/snobGroup";
import type {
  RankingItem,
  RankingItemSoryBy,
  RecentRankingItem,
} from "@/types/rankings";
import type { Snob } from "@/types/snob";
import type { GroupSyncState } from "./repositories";

const PAGE_SIZE = 20;

export async function localDataAvailableDexie(): Promise<boolean> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const count = await db.groups.count();
  return count > 0;
}

export async function getGroupSyncStateDexie(
  groupId: string,
): Promise<GroupSyncState | null> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const row = await db.sync_meta.get(groupId);
  if (!row) return null;
  return {
    complete: row.complete,
    highestPageSynced: row.highestPageSynced,
    totalItems: row.totalItems ?? null,
    lastSyncedAt: row.lastSyncedAt ?? null,
  };
}

export async function getAllGroupSyncStatesDexie(): Promise<
  Array<GroupSyncState & { groupId: string }>
> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  let rows = await db.sync_meta.toArray();
  if (rows.length === 0) {
    // Fallback to anonymous db
    try {
      const anonDb = getDexieDb("snobbin-offline-anonymous.db");
      rows = await anonDb.sync_meta.toArray();
    } catch {
      // ignore
    }
  }
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
  let db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  console.warn("[dexie-repos] getLocalGroupsDexie db:", dbName);
  try {
    const g = await db.groups.count();
    console.warn("[dexie-repos] current db groups count:", g);
    if (g === 0) {
      try {
        const anonDb = getDexieDb("snobbin-offline-anonymous.db");
        const ag = await anonDb.groups.count();
        console.warn("[dexie-repos] anon count:", ag);
        if (ag > 0) {
          db = anonDb;
          console.warn("[dexie-repos] switched to anon db");
        }
      } catch (e) {
        console.warn("[dexie-repos] anon count err", e);
      }
    }
  } catch (e) {
    console.warn("[dexie-repos] count err", e);
  }
  let snobId = getRememberedSnobId();
  console.warn("[dexie-repos] snobId:", snobId);
  if (!snobId) {
    try {
      const anonDb = getDexieDb("snobbin-offline-anonymous.db");
      const snobs = await anonDb.snobs.toArray();
      console.warn("[dexie-repos] anon snobs:", snobs.length);
      if (snobs.length > 0) {
        snobId = snobs[0].id;
        try {
          setRememberedSnobId(snobId);
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn("[dexie-repos] anon err", e);
    }
  }
  if (!snobId) {
    // Last resort: if groups exist anywhere, return them
    try {
      const ag = await db.groups.toArray();
      if (ag.length > 0) {
        const result: SnobGroup[] = [];
        for (const g of ag.filter(
          (x) => !(x as { deleted?: number | boolean }).deleted,
        )) {
          result.push({
            id: g.id,
            name: g.name,
            description: g.description,
            minRanking: g.minRanking,
            maxRanking: g.maxRanking,
            increments: g.increments,
            rankIcon: g.rankIcon,
            rankingsRequired: g.rankingsRequired,
            pictureUrl: g.pictureUrl,
          } as SnobGroup);
        }
        if (result.length > 0) {
          console.warn(
            "[dexie-repos] returning groups with no snobId:",
            result.length,
          );
          return result;
        }
      }
      const anonDb = getDexieDb("snobbin-offline-anonymous.db");
      const ag2 = await anonDb.groups.toArray();
      if (ag2.length > 0) {
        const result: SnobGroup[] = [];
        for (const g of ag2.filter(
          (x) => !(x as { deleted?: number | boolean }).deleted,
        )) {
          result.push({
            id: g.id,
            name: g.name,
            description: g.description,
            minRanking: g.minRanking,
            maxRanking: g.maxRanking,
            increments: g.increments,
            rankIcon: g.rankIcon,
            rankingsRequired: g.rankingsRequired,
            pictureUrl: g.pictureUrl,
          } as SnobGroup);
        }
        if (result.length > 0) {
          console.warn(
            "[dexie-repos] returning anon groups with no snobId:",
            result.length,
          );
          return result;
        }
      }
    } catch (e) {
      console.warn("[dexie-repos] last resort err", e);
    }
    return [];
  }

  let [groups, memberRows] = await Promise.all([
    db.groups.toArray(),
    db.group_members.where("snobId").equals(snobId).toArray(),
  ]);
  console.warn(
    "[dexie-repos] groups:",
    groups.length,
    "members:",
    memberRows.length,
  );
  if (groups.length === 0 || memberRows.length === 0) {
    try {
      const anonDb = getDexieDb("snobbin-offline-anonymous.db");
      const [ag, am] = await Promise.all([
        anonDb.groups.toArray(),
        snobId
          ? anonDb.group_members.where("snobId").equals(snobId).toArray()
          : anonDb.group_members.toArray(),
      ]);
      console.warn(
        "[dexie-repos] anon fallback groups:",
        ag.length,
        "members:",
        am.length,
      );
      if (ag.length > 0) groups = ag;
      if (am.length > 0) memberRows = am;
      if (groups.length > 0 || memberRows.length > 0) {
        // use anon db data
        const activeGroupIds = new Set(
          memberRows.filter((m) => m.role !== "DISABLED").map((m) => m.groupId),
        );
        const result: SnobGroup[] = [];
        if (activeGroupIds.size === 0 && groups.length > 0) {
          // no memberships - return all non-deleted groups
          for (const g of groups.filter((g) => !g.deleted)) {
            const members = await anonDb.group_members
              .where("groupId")
              .equals(g.id)
              .toArray();
            const snobIds = members.map((m) => m.snobId);
            const snobs =
              snobIds.length > 0
                ? await anonDb.snobs.where("id").anyOf(snobIds).toArray()
                : [];
            const snobMap = new Map(snobs.map((s) => [s.id, toSnob(s)]));
            const groupMembers: SnobGroupMember[] = members
              .map((m) => {
                const snob = snobMap.get(m.snobId);
                if (!snob) return null;
                return {
                  id: m.id,
                  snobId: m.snobId,
                  groupId: m.groupId,
                  role: m.role as SnobGroupMember["role"],
                  snob,
                };
              })
              .filter(Boolean) as SnobGroupMember[];
            result.push({
              id: g.id,
              name: g.name,
              description: g.description,
              minRanking: g.minRanking,
              maxRanking: g.maxRanking,
              increments: g.increments,
              rankIcon: g.rankIcon,
              rankingsRequired: g.rankingsRequired,
              pictureUrl: g.pictureUrl,
              members: groupMembers,
            } as SnobGroup);
          }
          console.warn(
            "[dexie-repos] returning fallback all groups:",
            result.length,
          );
          return result;
        }
        for (const g of groups.filter(
          (g) => !g.deleted && activeGroupIds.has(g.id),
        )) {
          const members = await anonDb.group_members
            .where("groupId")
            .equals(g.id)
            .toArray();
          const snobIds = members.map((m) => m.snobId);
          const snobs = await anonDb.snobs.where("id").anyOf(snobIds).toArray();
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
    } catch {
      // ignore
    }
  }

  const activeGroupIds = new Set(
    memberRows.filter((m) => m.role !== "DISABLED").map((m) => m.groupId),
  );

  const result: SnobGroup[] = [];
  for (const g of groups.filter(
    (g) => !g.deleted && activeGroupIds.has(g.id),
  )) {
    const members = await db.group_members
      .where("groupId")
      .equals(g.id)
      .toArray();
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
  if (result.length === 0) {
    try {
      const anonDb = getDexieDb("snobbin-offline-anonymous.db");
      const ag = await anonDb.groups.toArray();
      const res2: SnobGroup[] = [];
      for (const g of ag.filter((x) => !(x as { deleted?: number | boolean }).deleted)) {
        res2.push({
          id: g.id,
          name: g.name,
          description: g.description,
          minRanking: g.minRanking,
          maxRanking: g.maxRanking,
          increments: g.increments,
          rankIcon: g.rankIcon,
          rankingsRequired: g.rankingsRequired,
          pictureUrl: g.pictureUrl ?? undefined,
        } as SnobGroup);
      }
      if (res2.length > 0) return res2;
    } catch {
      // ignore
    }
    try {
      const ag = await db.groups.toArray();
      const res2: SnobGroup[] = [];
      for (const g of ag.filter((x) => !(x as { deleted?: number | boolean }).deleted)) {
        res2.push({
          id: g.id,
          name: g.name,
          description: g.description,
          minRanking: g.minRanking,
          maxRanking: g.maxRanking,
          increments: g.increments,
          rankIcon: g.rankIcon,
          rankingsRequired: g.rankingsRequired,
          pictureUrl: g.pictureUrl ?? undefined,
        } as SnobGroup);
      }
      if (res2.length > 0) return res2;
    } catch {
      // ignore
    }
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

export async function getLocalGroupForCurrentUserDexie(
  groupId: string,
): Promise<SnobGroup | null> {
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
  const invites = await db.group_invites
    .where("email")
    .equals(snob.email)
    .toArray();
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
  const attributes = await db.group_attributes
    .where("groupId")
    .equals(groupId)
    .toArray();
  const result: SnobGroupAttributeSummary[] = [];
  for (const attr of attributes) {
    const values = await db.item_attributes
      .where("attributeId")
      .equals(attr.id)
      .toArray();
    const valueSet = new Set(
      values
        .map((v) => v.attributeValue)
        .filter((v): v is string => Boolean(v)),
    );
    for (const v of Array.from(valueSet)) {
      result.push({
        attributeId: attr.id,
        attributeValue: v,
        count: values.filter((x) => x.attributeValue === v).length,
      });
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
): Promise<{
  data: RankingItem[];
  total: number;
  currentPage: number;
  totalPages: number;
}> {
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
    items = items.filter((i) =>
      (i.description || "").toLowerCase().includes(keyword),
    );
  }

  const total = items.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginatedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const results: RankingItem[] = [];
  for (const item of paginatedItems) {
    const rankings = await db.rankings
      .where("itemId")
      .equals(item.id)
      .toArray();
    const itemAttrs = await db.item_attributes
      .where("itemId")
      .equals(item.id)
      .toArray();
    const attributeMap = new Map<string, string>();
    for (const ia of itemAttrs) {
      const attr = await db.group_attributes.get(ia.attributeId);
      if (attr) attributeMap.set(attr.name, ia.attributeValue);
    }
    const members = await db.group_members
      .where("groupId")
      .equals(groupId)
      .toArray();
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
    const attributesArr = Array.from(attributeMap.entries()).map(
      ([name, value]) => ({
        id: name,
        attributeId: name,
        attributeValue: value,
      }),
    );
    results.push({
      id: item.id,
      groupId: item.groupId,
      description: item.description,
      averageRanking: item.averageRanking ?? null,
      rankings: rankingItems,
      ranked: item.ranked,
      attributes: attributesArr,
      imageUrl: item.imageUrl ?? null,
      imageId: item.imageId ?? null,
      createdDate: item.createdDate ? new Date(item.createdDate) : new Date(),
      updatedDate: item.updatedDate ? new Date(item.updatedDate) : new Date(),
    } as unknown as RankingItem);
  }
  return {
    data: results,
    total,
    currentPage: page,
    totalPages,
  };
}

export async function getLocalPendingInvitesDexie(): Promise<
  SnobGroupInvite[]
> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  if (!snobId) return [];
  const snob = await db.snobs.get(snobId);
  if (!snob?.email) return [];
  const invites = await db.group_invites
    .where("email")
    .equals(snob.email)
    .toArray();
  const result: SnobGroupInvite[] = [];
  for (const inv of invites) {
    const group = await db.groups.get(inv.groupId);
    if (!group) continue;
    if (inv.status === "ACCEPTED" || inv.status === "DECLINED") continue;
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

export async function getLocalRecentRankingsDexie(
  limit = 10,
): Promise<RecentRankingItem[]> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  if (!snobId) return [];
  const snob = await db.snobs.get(snobId);
  if (!snob) return [];
  const memberRows = await db.group_members
    .where("snobId")
    .equals(snobId)
    .toArray();
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
      groupId: group.id,
      groupName: group.name,
      description: item.description,
      createdDate: r.createdDate ? new Date(r.createdDate) : new Date(),
    });
  }
  return results;
}
