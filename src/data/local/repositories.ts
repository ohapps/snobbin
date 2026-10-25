/**
 * Read-side repositories over the local SQLite mirror.
 *
 * Each function returns the *same shapes* the server utils return, so the pages
 * can swap server utils for these when offline:
 *  - `SnobGroup`                ← `getGroupForCurrentUser`
 *  - `PaginatedResults`         ← `getItems`
 *  - `SnobGroupAttributeSummary[]` ← `getGroupAttributeSummary`
 *  - `SnobGroupInvite[]`        ← group invites
 *
 * Query semantics deliberately mirror `src/server/utils/items/get-items.ts`:
 * page size 20, ILIKE keyword search over description OR attribute value, sort
 * by DESCRIPTION / RANKING / MOST_RECENT, ranked-status filter, and per-attribute
 * filters. See docs/OFFLINE_PLAN.md §6.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { localDb } from "./sqlite-proxy-driver";
import { sqliteClient } from "./sqlite-client";
import { ensureLocalSchema } from "./migrations";
import {
  groupAttributesTable,
  groupInvitesTable,
  groupMembersTable,
  groupsTable,
  itemAttributesTable,
  itemsTable,
  rankingsTable,
  snobsTable,
  syncMetaTable,
} from "./schema";
import type { PaginatedResults, RankingItem, RankingItemSoryBy, RecentRankingItem } from "@/types/rankings";
import type {
  SnobGroup,
  SnobGroupAttribute,
  SnobGroupAttributeSummary,
  SnobGroupInvite,
  SnobGroupMember,
  SnobGroupRole,
} from "@/types/snobGroup";
import type { Snob } from "@/types/snob";
import { GroupInviteStatus } from "@/types/snobGroup";
import { toLikePattern } from "./mappers";
import { getRememberedSnobId } from "./identity";

const PAGE_SIZE = 20;

/** True when the user has any mirrored data at all. */
export async function localDataAvailable(): Promise<boolean> {
  await ensureLocalSchema();
  const rows = await localDb.select().from(groupsTable).limit(1);
  return rows.length > 0;
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
  await ensureLocalSchema();
  const rows = await localDb
    .select()
    .from(syncMetaTable)
    .where(eq(syncMetaTable.groupId, groupId));
  const row = rows[0];
  if (!row) return null;
  return {
    complete: row.complete,
    highestPageSynced: row.highestPageSynced,
    totalItems: row.totalItems ?? null,
    lastSyncedAt: row.lastSyncedAt ?? null,
  };
}

export async function getAllGroupSyncStates(): Promise<
  Array<
    GroupSyncState & {
      groupId: string;
    }
  >
> {
  await ensureLocalSchema();
  const rows = await localDb.select().from(syncMetaTable);
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

export async function getLocalGroups(): Promise<SnobGroup[]> {
  await ensureLocalSchema();

  const snobId = getRememberedSnobId();
  if (!snobId) return [];

  const [groups, memberRows] = await Promise.all([
    localDb.select().from(groupsTable),
    localDb
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.snobId, snobId)),
  ]);

  // Match the server: only groups the user is an active member of, and not
  // soft-deleted.
  const activeGroupIds = new Set(
    memberRows.filter((m) => m.role !== "DISABLED").map((m) => m.groupId),
  );

  return Promise.all(
    groups
      .filter((g) => !g.deleted && activeGroupIds.has(g.id))
      .map((g) => hydrateGroup(g)),
  );
}

/** The signed-in snob, read from the mirror. */
export async function getLocalCurrentUser(): Promise<Snob | null> {
  await ensureLocalSchema();
  const snobId = getRememberedSnobId();
  if (!snobId) return null;
  const rows = await localDb
    .select()
    .from(snobsTable)
    .where(eq(snobsTable.id, snobId));
  return rows.length > 0 ? toSnob(rows[0]) : null;
}

/** Mirrors `getLastGroupId` for the offline landing redirect. */
export async function getLocalLastGroupId(): Promise<string | null> {
  const user = await getLocalCurrentUser();
  return user?.lastGroupId ?? null;
}

/** Mirrors `getPendingInvites` against the mirror. */
export async function getLocalPendingInvites(): Promise<SnobGroupInvite[]> {
  await ensureLocalSchema();
  const user = await getLocalCurrentUser();
  if (!user) return [];

  const rows = await sqliteClient.query(
    `SELECT i.id AS id, i.email AS email, i.status AS status,
            i.group_id AS groupId, g.name AS groupName
     FROM group_invites i
     INNER JOIN groups g ON g.id = i.group_id
     WHERE i.email = ? AND i.status = ?
     ORDER BY g.name`,
    [user.email, GroupInviteStatus.PENDING],
  );

  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    status: String(r.status) as GroupInviteStatus,
    groupId: String(r.groupId),
    groupName: String(r.groupName),
  }));
}

/** Mirrors `getRecentItems` (last 5 days, newest first, max 5). */
export async function getLocalRecentItems(): Promise<RecentRankingItem[]> {
  await ensureLocalSchema();

  const snobId = getRememberedSnobId();
  if (!snobId) return [];

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const memberRows = await localDb
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.snobId, snobId));
  const memberGroupIds = memberRows
    .filter((m) => m.role !== "DISABLED")
    .map((m) => m.groupId);
  if (memberGroupIds.length === 0) return [];

  const rows = await sqliteClient.query(
    `SELECT i.id AS id, i.group_id AS groupId, g.name AS groupName,
            i.description AS description, i.created_date AS createdDate
     FROM items i
     INNER JOIN groups g ON g.id = i.group_id
     WHERE i.group_id IN (${memberGroupIds.map(() => "?").join(",")})
       AND i.created_date > ?
     ORDER BY i.created_date DESC
     LIMIT 5`,
    [...memberGroupIds, fiveDaysAgo.toISOString()],
  );

  return rows.map((r) => ({
    id: String(r.id),
    groupId: String(r.groupId),
    groupName: String(r.groupName),
    description: String(r.description),
    createdDate: new Date(String(r.createdDate)),
  }));
}

/** Mirrors `getGroupForCurrentUser` but reads from the mirror. */
export async function getLocalGroupForCurrentUser(
  groupId: string,
): Promise<SnobGroup | null> {
  await ensureLocalSchema();
  const rows = await localDb
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId));
  if (rows.length === 0) return null;
  return hydrateGroup(rows[0]);
}

async function hydrateGroup(row: {
  id: string;
  name: string;
  description: string;
  minRanking: number;
  maxRanking: number;
  increments: number;
  rankIcon: string;
  rankingsRequired: number;
  pictureUrl: string | null;
}): Promise<SnobGroup> {
  const groupId = row.id;

  const [memberRows, attrRows, inviteRows] = await Promise.all([
    localDb
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, groupId)),
    localDb
      .select()
      .from(groupAttributesTable)
      .where(eq(groupAttributesTable.groupId, groupId)),
    localDb
      .select()
      .from(groupInvitesTable)
      .where(eq(groupInvitesTable.groupId, groupId)),
  ]);

  const snobIds = memberRows.map((m) => m.snobId);
  const snobRows =
    snobIds.length > 0
      ? await localDb.select().from(snobsTable) // small; filter in JS
      : [];
  const snobById = new Map(snobRows.map((s) => [s.id, toSnob(s)]));

  const members: SnobGroupMember[] = memberRows.map((m) => ({
    id: m.id,
    snob:
      snobById.get(m.snobId) ??
      ({ id: m.snobId, email: "", firstName: null, lastName: null } as Snob),
    role: m.role as SnobGroupRole,
  }));

  const attributes: SnobGroupAttribute[] = attrRows.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  const invites: SnobGroupInvite[] = inviteRows.map((i) => ({
    id: i.id,
    email: i.email,
    status: i.status as GroupInviteStatus,
    groupId: i.groupId,
    groupName: row.name,
  }));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    minRanking: row.minRanking,
    maxRanking: row.maxRanking,
    increments: row.increments,
    rankIcon: row.rankIcon,
    rankingsRequired: row.rankingsRequired,
    pictureUrl: row.pictureUrl,
    members,
    invites,
    attributes,
  };
}

/** Mirrors `getGroupAttributeSummary` against the mirror. */
export async function getLocalGroupAttributeSummary(
  groupId: string,
): Promise<SnobGroupAttributeSummary[]> {
  await ensureLocalSchema();
  // Uses the worker client directly so rows come back keyed by column name
  // (Drizzle's proxy `all` returns positional arrays by design).
  const rows = await sqliteClient.query(
    `SELECT ia.attribute_id AS attributeId,
            ia.attribute_value AS attributeValue,
            COUNT(ia.id) AS count
     FROM item_attributes ia
     INNER JOIN items i ON i.id = ia.item_id
     WHERE i.group_id = ?
     GROUP BY ia.attribute_id, ia.attribute_value
     ORDER BY ia.attribute_id, ia.attribute_value`,
    [groupId],
  );
  return rows.map((r) => ({
    attributeId: String(r.attributeId),
    attributeValue: String(r.attributeValue),
    count: Number(r.count),
  }));
}

function sortClause(sortBy?: string): SQL {
  switch (sortBy) {
    case "DESCRIPTION":
      return asc(itemsTable.description) as unknown as SQL;
    case "RANKING":
      return desc(itemsTable.averageRanking) as unknown as SQL;
    default:
      return desc(itemsTable.createdDate) as unknown as SQL;
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
  await ensureLocalSchema();

  const filters: SQL[] = [eq(itemsTable.groupId, groupId) as unknown as SQL];

  if (keyword) {
    const pattern = toLikePattern(keyword);
    const keywordFilter = sql`(
      lower(${itemsTable.description}) LIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM item_attributes iak
        WHERE iak.item_id = items.id
          AND lower(iak.attribute_value) LIKE ${pattern}
      )
    )`;
    filters.push(keywordFilter as unknown as SQL);
  }

  if (status && status !== "all") {
    filters.push(eq(itemsTable.ranked, status === "ranked") as unknown as SQL);
  }

  if (attributeFilters) {
    for (const [attributeId, attributeValue] of Object.entries(
      attributeFilters,
    )) {
      if (attributeValue && attributeValue !== "all") {
        filters.push(
          sql`EXISTS (
            SELECT 1 FROM item_attributes iaf
            WHERE iaf.item_id = items.id
              AND iaf.attribute_id = ${attributeId}
              AND iaf.attribute_value = ${attributeValue}
          )` as unknown as SQL,
        );
      }
    }
  }

  const where = and(...filters);

  const countRows = await localDb
    .select({ count: sql<number>`count(*)` })
    .from(itemsTable)
    .where(where);

  const total = Number(countRows[0]?.count ?? 0);
  const offset = (page - 1) * PAGE_SIZE;

  const itemRows = await localDb
    .select()
    .from(itemsTable)
    .where(where)
    .orderBy(sortClause(sortBy), asc(itemsTable.id))
    .limit(PAGE_SIZE)
    .offset(offset);

  const items = await Promise.all(itemRows.map((item) => hydrateItem(item)));

  return { items, total, pageSize: PAGE_SIZE };
}

async function hydrateItem(item: {
  id: string;
  groupId: string;
  description: string;
  ranked: boolean;
  averageRanking: number | null;
  imageId: string | null;
  imageUrl: string | null;
  createdDate: string | null;
  createdBy: string | null;
}): Promise<RankingItem> {
  const [attrRows, rankingRows] = await Promise.all([
    localDb
      .select()
      .from(itemAttributesTable)
      .where(eq(itemAttributesTable.itemId, item.id)),
    localDb
      .select()
      .from(rankingsTable)
      .where(eq(rankingsTable.itemId, item.id)),
  ]);

  return {
    id: item.id,
    groupId: item.groupId,
    description: item.description,
    ranked: item.ranked,
    averageRanking: item.averageRanking,
    imageId: item.imageId,
    imageUrl: item.imageUrl,
    createdDate: item.createdDate ? new Date(item.createdDate) : null,
    createdBy: item.createdBy,
    attributes: attrRows.map((a) => ({
      id: a.id,
      attributeId: a.attributeId,
      attributeValue: a.attributeValue,
    })),
    rankings: rankingRows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      groupMemberId: r.groupMemberId,
      ranking: r.ranking,
      notes: r.notes,
    })),
  };
}
