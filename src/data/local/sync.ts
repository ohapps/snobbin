/**
 * Sync engine: pulls data from the `/api/offline/*` endpoints and writes it into
 * the local SQLite mirror.
 *
 * Design (see docs/OFFLINE_PLAN.md §5):
 *  - Bootstrap: identity + groups + memberships + snobs (small, one shot).
 *  - Per group meta: members, snobs, attributes, invites (small, one shot).
 *  - Per group items: paginated, resumable, progressive (handles ~1,600 items).
 *
 * Read-only mirror: writes go one direction only (server → local). Never a
 * write queue. If a sync page fails partway, `highestPageSynced` records how far
 * we got so the next run resumes.
 */

import { eq, sql } from "drizzle-orm";
import { localDb } from "./sqlite-proxy-driver";
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
import type {
  ApiSnob,
  BootstrapResponse,
  GroupItemsPageResponse,
  GroupMetaResponse,
} from "./api-types";
import { setRememberedSnobId } from "./identity";

const ITEMS_PAGE_SIZE = 20;

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    // Always hit the network for sync; never serve a stale SW copy.
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Sync request failed: ${response.status} ${url}`);
  }
  return (await response.json()) as T;
}

function toSnobRow(s: ApiSnob) {
  return {
    id: s.id,
    email: s.email,
    firstName: s.first_name,
    lastName: s.last_name,
    pictureUrl: s.picture_url,
    lastGroupId: s.last_group_id,
    isPremium: s.is_premium === 1,
  };
}

/** Upserts groups, memberships, and snobs from the bootstrap payload. */
export async function applyBootstrap(payload: BootstrapResponse): Promise<void> {
  await ensureLocalSchema();

  await upsertGroups(payload.groups);
  await upsertSnobs(payload.snobs);
  await upsertMemberships(payload.memberships);

  // Remember which snob this mirror belongs to so local reads (my groups,
  // invites, profile) know who "me" is without the server.
  setRememberedSnobId(payload.snob.id);
}

async function upsertGroups(groups: BootstrapResponse["groups"]) {
  if (groups.length === 0) return;
  await localDb
    .insert(groupsTable)
    .values(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        minRanking: g.min_ranking,
        maxRanking: g.max_ranking,
        increments: g.increments,
        rankIcon: g.rank_icon,
        rankingsRequired: g.rankings_required,
        deleted: g.deleted === 1,
        pictureUrl: g.picture_url,
      })),
    )
    .onConflictDoUpdate({
      target: groupsTable.id,
      set: {
        name: sqlExcluded("name"),
        description: sqlExcluded("description"),
        minRanking: sqlExcluded("min_ranking"),
        maxRanking: sqlExcluded("max_ranking"),
        increments: sqlExcluded("increments"),
        rankIcon: sqlExcluded("rank_icon"),
        rankingsRequired: sqlExcluded("rankings_required"),
        deleted: sqlExcluded("deleted"),
        pictureUrl: sqlExcluded("picture_url"),
      },
    });
}

async function upsertSnobs(snobs: ApiSnob[]) {
  if (snobs.length === 0) return;
  await localDb
    .insert(snobsTable)
    .values(snobs.map(toSnobRow))
    .onConflictDoUpdate({
      target: snobsTable.id,
      set: {
        email: sqlExcluded("email"),
        firstName: sqlExcluded("first_name"),
        lastName: sqlExcluded("last_name"),
        pictureUrl: sqlExcluded("picture_url"),
        lastGroupId: sqlExcluded("last_group_id"),
        isPremium: sqlExcluded("is_premium"),
      },
    });
}

async function upsertMemberships(memberships: BootstrapResponse["memberships"]) {
  if (memberships.length === 0) return;
  await localDb
    .insert(groupMembersTable)
    .values(
      memberships.map((m) => ({
        id: m.id,
        groupId: m.group_id,
        snobId: m.snob_id,
        role: m.role,
      })),
    )
    .onConflictDoUpdate({
      target: groupMembersTable.id,
      set: { role: sqlExcluded("role") },
    });
}

/** Upserts the small per-group metadata (members, snobs, attributes, invites). */
export async function applyGroupMeta(payload: GroupMetaResponse): Promise<void> {
  await ensureLocalSchema();

  await upsertGroups([payload.group]);
  await upsertMemberships(payload.members);
  await upsertSnobs(payload.snobs);

  if (payload.attributes.length > 0) {
    await localDb
      .insert(groupAttributesTable)
      .values(
        payload.attributes.map((a) => ({
          id: a.id,
          groupId: a.group_id,
          name: a.name,
        })),
      )
      .onConflictDoUpdate({
        target: groupAttributesTable.id,
        set: { name: sqlExcluded("name") },
      });
  }

  if (payload.invites.length > 0) {
    await localDb
      .insert(groupInvitesTable)
      .values(
        payload.invites.map((i) => ({
          id: i.id,
          groupId: i.group_id,
          email: i.email,
          status: i.status,
        })),
      )
      .onConflictDoUpdate({
        target: groupInvitesTable.id,
        set: { status: sqlExcluded("status") },
      });
  }
}

/** Upserts one page of items plus their attributes and rankings. */
export async function applyItemsPage(
  groupId: string,
  payload: GroupItemsPageResponse,
): Promise<void> {
  await ensureLocalSchema();

  if (payload.items.length > 0) {
    await localDb
      .insert(itemsTable)
      .values(
        payload.items.map((item) => ({
          id: item.id,
          groupId: item.group_id,
          description: item.description,
          ranked: item.ranked === 1,
          averageRanking: item.average_ranking,
          imageId: item.image_id,
          imageUrl: item.image_url,
          createdDate: item.created_date,
          updatedDate: item.updated_date,
          createdBy: item.created_by,
          updatedBy: item.updated_by,
        })),
      )
      .onConflictDoUpdate({
        target: itemsTable.id,
        set: {
          description: sqlExcluded("description"),
          ranked: sqlExcluded("ranked"),
          averageRanking: sqlExcluded("average_ranking"),
          imageId: sqlExcluded("image_id"),
          imageUrl: sqlExcluded("image_url"),
          updatedDate: sqlExcluded("updated_date"),
        },
      });
  }

  if (payload.itemAttributes.length > 0) {
    await localDb
      .insert(itemAttributesTable)
      .values(
        payload.itemAttributes.map((ia) => ({
          id: ia.id,
          itemId: ia.item_id,
          attributeId: ia.attribute_id,
          attributeValue: ia.attribute_value,
        })),
      )
      .onConflictDoUpdate({
        target: itemAttributesTable.id,
        set: { attributeValue: sqlExcluded("attribute_value") },
      });
  }

  if (payload.rankings.length > 0) {
    await localDb
      .insert(rankingsTable)
      .values(
        payload.rankings.map((r) => ({
          id: r.id,
          itemId: r.item_id,
          groupMemberId: r.group_member_id,
          ranking: r.ranking,
          notes: r.notes,
          createdDate: r.created_date,
          updatedDate: r.updated_date,
        })),
      )
      .onConflictDoUpdate({
        target: rankingsTable.id,
        set: {
          ranking: sqlExcluded("ranking"),
          notes: sqlExcluded("notes"),
          updatedDate: sqlExcluded("updated_date"),
        },
      });
  }
}

export interface SyncProgress {
  groupId: string;
  page: number;
  totalItems: number;
  totalPages: number;
  done: boolean;
}

export interface SyncGroupOptions {
  /** Resume from the first page after the last one synced. Default: resume. */
  fromStart?: boolean;
  /** Called after each page so the UI can show progress. */
  onProgress?: (progress: SyncProgress) => void;
  /** Abort signal so a sync can be cancelled. */
  signal?: AbortSignal;
}

/**
 * Pulls one group's items page by page into the mirror. Resumable: unless
 * `fromStart` is set, it continues from `highestPageSynced + 1`.
 */
export async function syncGroupItems(
  groupId: string,
  options: SyncGroupOptions = {},
): Promise<SyncProgress> {
  await ensureLocalSchema();

  const existing = await localDb
    .select()
    .from(syncMetaTable)
    .where(eq(syncMetaTable.groupId, groupId));

  const alreadySynced = options.fromStart
    ? 0
    : (existing[0]?.highestPageSynced ?? 0);

  let page = alreadySynced + 1;
  let total = existing[0]?.totalItems ?? 0;
  let complete = false;

  // Loop until a page reports completion or we hit an empty page.
  for (;;) {
    if (options.signal?.aborted) {
      throw new Error("Sync aborted");
    }

    const payload = await apiGet<GroupItemsPageResponse>(
      `/api/offline/groups/${encodeURIComponent(groupId)}/items?page=${page}&pageSize=${ITEMS_PAGE_SIZE}`,
    );

    await applyItemsPage(groupId, payload);

    total = payload.total;
    complete = payload.complete;

    await localDb
      .insert(syncMetaTable)
      .values({
        groupId,
        lastSyncedAt: new Date().toISOString(),
        complete,
        highestPageSynced: page,
        totalItems: total,
      })
      .onConflictDoUpdate({
        target: syncMetaTable.groupId,
        set: {
          lastSyncedAt: sqlExcluded("last_synced_at"),
          complete: sqlExcluded("complete"),
          highestPageSynced: sqlExcluded("highest_page_synced"),
          totalItems: sqlExcluded("total_items"),
        },
      });

    options.onProgress?.({
      groupId,
      page,
      totalItems: total,
      totalPages: Math.ceil(total / ITEMS_PAGE_SIZE),
      done: complete,
    });

    if (complete || payload.items.length === 0) {
      break;
    }
    page += 1;
  }

  return {
    groupId,
    page,
    totalItems: total,
    totalPages: Math.ceil(total / ITEMS_PAGE_SIZE),
    done: true,
  };
}

/** Convenience: full sync for one group (meta + all item pages). */
export async function syncGroup(
  groupId: string,
  options: SyncGroupOptions = {},
): Promise<void> {
  const meta = await apiGet<GroupMetaResponse>(
    `/api/offline/groups/${encodeURIComponent(groupId)}/meta`,
  );
  await applyGroupMeta(meta);
  await syncGroupItems(groupId, options);
}

/** Full bootstrap sync (identity + groups). Call on login / app start online. */
export async function syncBootstrap(): Promise<BootstrapResponse> {
  const payload = await apiGet<BootstrapResponse>("/api/offline/bootstrap");
  await applyBootstrap(payload);
  return payload;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

/**
 * Drizzle's `onConflictDoUpdate` needs a reference to the *excluded* row, i.e.
 * `excluded.column`. Building it from `sql.raw` keeps the setters terse.
 */
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`);
}
