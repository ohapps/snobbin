/**
 * Read models over the per-user IndexedDB mirror (Dexie).
 */

import { currentDexieDb } from "./dexie-db";
import { getRememberedSnobId } from "./identity";
import type {
  SnobGroup,
  SnobGroupAttribute,
  SnobGroupAttributeSummary,
  SnobGroupInvite,
  SnobGroupMember,
} from "@/types/snobGroup";
import type { RankingItem, RecentRankingItem } from "@/types/rankings";
import { RankingItemSoryBy } from "@/types/rankings";
import type { Snob } from "@/types/snob";
import type { GroupSyncState } from "./repositories";

const PAGE_SIZE = 20;

export async function localDataAvailableDexie(): Promise<boolean> {
  const db = currentDexieDb();
  const count = await db.groups.count();
  return count > 0;
}

export async function getGroupSyncStateDexie(
  groupId: string,
): Promise<GroupSyncState | null> {
  const db = currentDexieDb();
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
  const db = currentDexieDb();
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
  const db = currentDexieDb();
  // Without the snob id we can't tell which groups are ours; bootstrap sets it.
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
    const groupMembers: SnobGroupMember[] = [];
    for (const m of members) {
      const snob = snobMap.get(m.snobId);
      if (!snob) continue;
      groupMembers.push({
        id: m.id,
        snobId: m.snobId,
        groupId: m.groupId,
        role: m.role as SnobGroupMember["role"],
        snob,
      } as SnobGroupMember);
    }
    const [attributeRows, inviteRows] = await Promise.all([
      db.group_attributes.where("groupId").equals(g.id).toArray(),
      db.group_invites.where("groupId").equals(g.id).toArray(),
    ]);
    const attributes: SnobGroupAttribute[] = attributeRows
      .map((a) => ({ id: a.id, name: a.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const invites: SnobGroupInvite[] = inviteRows.map((inv) => ({
      id: inv.id,
      email: inv.email,
      status: inv.status as SnobGroupInvite["status"],
      groupId: inv.groupId,
      groupName: g.name,
    }));

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
      attributes,
      invites,
    } as SnobGroup);
  }
  return result;
}

export async function getLocalCurrentUserDexie(): Promise<Snob | null> {
  const db = currentDexieDb();
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
  const db = currentDexieDb();
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
  const db = currentDexieDb();
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
    /** attributeId -> exact value ("all" or empty means no filter). */
    attributeFilters?: Record<string, string>;
  } = {},
): Promise<{
  data: RankingItem[];
  total: number;
  currentPage: number;
  totalPages: number;
}> {
  const db = currentDexieDb();
  const page = options.page ?? 1;
  const keyword = options.keyword?.trim().toLowerCase();

  let items = await db.items.where("groupId").equals(groupId).toArray();

  if (options.rankedStatus === "ranked") {
    items = items.filter((i) => i.ranked);
  } else if (options.rankedStatus === "unranked") {
    items = items.filter((i) => !i.ranked);
  }

  const activeAttributeFilters = Object.entries(
    options.attributeFilters ?? {},
  ).filter(([, value]) => value && value !== "all");

  // Item attributes are only needed for keyword and attribute filtering.
  if (keyword || activeAttributeFilters.length > 0) {
    const itemIds = items.map((i) => i.id);
    const attrRows =
      itemIds.length > 0
        ? await db.item_attributes.where("itemId").anyOf(itemIds).toArray()
        : [];
    const attrsByItem = new Map<string, typeof attrRows>();
    for (const row of attrRows) {
      const list = attrsByItem.get(row.itemId);
      if (list) list.push(row);
      else attrsByItem.set(row.itemId, [row]);
    }

    // Mirrors the server: keyword matches the description OR any attribute value.
    if (keyword) {
      items = items.filter(
        (i) =>
          (i.description || "").toLowerCase().includes(keyword) ||
          (attrsByItem.get(i.id) ?? []).some((a) =>
            (a.attributeValue || "").toLowerCase().includes(keyword),
          ),
      );
    }

    // Each active filter requires an exact attribute value match.
    for (const [attributeId, value] of activeAttributeFilters) {
      items = items.filter((i) =>
        (attrsByItem.get(i.id) ?? []).some(
          (a) => a.attributeId === attributeId && a.attributeValue === value,
        ),
      );
    }
  }

  // Mirrors the server's `getSortBy`, with id as the tiebreaker.
  const byId = (a: { id: string }, b: { id: string }) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const time = (d: string | null | undefined) => (d ? Date.parse(d) : 0);
  items.sort((a, b) => {
    let cmp: number;
    switch (options.sortBy) {
      case RankingItemSoryBy.DESCRIPTION:
        cmp = (a.description || "").localeCompare(b.description || "");
        break;
      case RankingItemSoryBy.RANKING:
        cmp = (b.averageRanking ?? -Infinity) - (a.averageRanking ?? -Infinity);
        break;
      default:
        cmp = time(b.createdDate) - time(a.createdDate);
    }
    return cmp || byId(a, b);
  });

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
    // Same shape as the server: keyed by attribute *id*, which ItemCard looks up.
    const attributesArr = itemAttrs.map((ia) => ({
      id: ia.id,
      attributeId: ia.attributeId,
      attributeValue: ia.attributeValue,
    }));
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
  const db = currentDexieDb();
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
  const db = currentDexieDb();
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
