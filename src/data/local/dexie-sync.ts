import { currentDexieDb } from "./dexie-db";
import { getRememberedSub, setRememberedSnobId } from "./identity";
import type {
  ApiItem,
  ApiItemAttribute,
  ApiRanking,
  BootstrapResponse,
  GroupChangesResponse,
  GroupItemsPageResponse,
  GroupMetaResponse,
} from "./api-types";
import type {
  LocalGroup,
  LocalSnob,
  LocalGroupMember,
  LocalGroupInvite,
  LocalGroupAttribute,
  LocalItem,
  LocalItemAttribute,
  LocalRanking,
  LocalSyncMeta,
} from "./schema";

export async function syncBootstrapDexie(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const db = currentDexieDb();
  // The mirror is namespaced per Auth0 `sub`. Until OfflineIdentitySync has
  // adopted the identity we must not write anything (it would land in the
  // anonymous database and never be read again).
  if (!getRememberedSub()) return { ok: false, reason: "no-identity" };

  try {
    const res = await fetch("/api/offline/bootstrap");
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    const data: BootstrapResponse = await res.json();

    await db.transaction(
      "rw",
      [db.snobs, db.groups, db.group_members],
      async () => {
        await db.snobs.put({
          id: data.snob.id,
          email: data.snob.email,
          firstName: data.snob.first_name,
          lastName: data.snob.last_name,
          pictureUrl: data.snob.picture_url,
          lastGroupId: data.snob.last_group_id,
          isPremium: data.snob.is_premium === 1,
        } as LocalSnob);
        for (const s of data.snobs) {
          await db.snobs.put({
            id: s.id,
            email: s.email,
            firstName: s.first_name,
            lastName: s.last_name,
            pictureUrl: s.picture_url,
            lastGroupId: s.last_group_id,
            isPremium: s.is_premium === 1,
          } as LocalSnob);
        }
        for (const g of data.groups) {
          await db.groups.put({
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
          } as LocalGroup);
        }
        for (const m of data.memberships) {
          await db.group_members.put({
            id: m.id,
            groupId: m.group_id,
            snobId: m.snob_id,
            role: m.role,
          } as LocalGroupMember);
        }
      },
    );
    setRememberedSnobId(data.snob.id);

    // Sync meta for each group
    for (const g of data.groups) {
      const existing = await db.sync_meta.get(g.id);
      if (!existing) {
        await db.sync_meta.put({
          groupId: g.id,
          complete: false,
          highestPageSynced: 0,
          totalItems: null,
          lastSyncedAt: null,
          state: null,
        } as LocalSyncMeta);
      }
    }

    // Prune groups the server no longer returns (deleted, left, disabled) so
    // their sync state and mirrored data don't linger as orphans.
    const liveGroupIds = new Set(data.groups.map((g) => g.id));
    const staleGroupIds = (await db.sync_meta.toCollection().primaryKeys())
      .map(String)
      .filter((id) => !liveGroupIds.has(id));
    if (staleGroupIds.length > 0) {
      await pruneGroupsDexie(staleGroupIds);
    }
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, reason: "error" };
  }
}

/** Removes a set of groups and everything mirrored under them. */
async function pruneGroupsDexie(groupIds: string[]): Promise<void> {
  const db = currentDexieDb();
  await db.transaction(
    "rw",
    [
      db.groups,
      db.group_members,
      db.group_attributes,
      db.items,
      db.item_attributes,
      db.rankings,
      db.sync_meta,
    ],
    async () => {
      const itemIds = (await db.items
        .where("groupId")
        .anyOf(groupIds)
        .primaryKeys()) as string[];
      if (itemIds.length > 0) {
        await db.item_attributes.where("itemId").anyOf(itemIds).delete();
        await db.rankings.where("itemId").anyOf(itemIds).delete();
        await db.items.bulkDelete(itemIds);
      }
      await db.group_attributes.where("groupId").anyOf(groupIds).delete();
      await db.group_members.where("groupId").anyOf(groupIds).delete();
      await db.groups.bulkDelete(groupIds);
      await db.sync_meta.bulkDelete(groupIds);
    },
  );
}

/* -------------------------------------------------------------------------
 * Group sync
 *
 * `syncGroupDexie` refreshes a group's meta, then either:
 *  - applies an incremental `/changes` delta, when the group is fully mirrored
 *    and has a change cursor (cheap: usually a handful of items), or
 *  - re-mirrors every page of items (first sync, an interrupted sync, a missing
 *    cursor, or a delta the server says is too large).
 * ---------------------------------------------------------------------- */

/** Re-fetch this much before the cursor, to absorb app/DB clock skew. Applying
 * an item twice is harmless (upserts). */
const CURSOR_OVERLAP_MS = 2 * 60 * 1000;

const PAGE_SIZE = 20;

/** Per-group sync state kept in `sync_meta.state` (JSON). */
interface GroupSyncCursorState {
  /** Server time to pass as `/changes?since=` next time. */
  changesCursor?: string;
}

function readCursor(meta: LocalSyncMeta | undefined): string | null {
  if (!meta?.state) return null;
  try {
    return (
      (JSON.parse(meta.state) as GroupSyncCursorState).changesCursor ?? null
    );
  } catch {
    return null;
  }
}

function cursorState(cursor: string): string {
  return JSON.stringify({
    changesCursor: cursor,
  } satisfies GroupSyncCursorState);
}

function toLocalItem(item: ApiItem): LocalItem {
  return {
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
  } as LocalItem;
}

function toLocalItemAttribute(ia: ApiItemAttribute): LocalItemAttribute {
  return {
    id: ia.id,
    itemId: ia.item_id,
    attributeId: ia.attribute_id,
    attributeValue: ia.attribute_value,
  } as LocalItemAttribute;
}

function toLocalRanking(r: ApiRanking): LocalRanking {
  return {
    id: r.id,
    itemId: r.item_id,
    groupMemberId: r.group_member_id,
    ranking: r.ranking,
    notes: r.notes,
    createdDate: r.created_date,
    updatedDate: r.updated_date,
  } as LocalRanking;
}

/** Deletes items and everything hanging off them. Call inside a transaction
 * that includes items, item_attributes and rankings. */
async function deleteItems(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const db = currentDexieDb();
  await db.item_attributes.where("itemId").anyOf(itemIds).delete();
  await db.rankings.where("itemId").anyOf(itemIds).delete();
  await db.items.bulkDelete(itemIds);
}

/**
 * Fetches and stores the group row, members, attributes, and invites. These
 * sets are *replaced* for the group, so members/attributes/invites removed on
 * the server disappear locally too, along with item attribute values for
 * attributes that no longer exist (deleting a group attribute doesn't bump any
 * item's `updated_date`, so `/changes` would never report it).
 */
async function syncGroupMeta(groupId: string): Promise<GroupMetaResponse> {
  const db = currentDexieDb();
  const metaRes = await fetch(
    `/api/offline/groups/${encodeURIComponent(groupId)}/meta`,
  );
  if (!metaRes.ok) throw new Error(`meta ${metaRes.status}`);
  const meta: GroupMetaResponse = await metaRes.json();

  await db.transaction(
    "rw",
    [
      db.groups,
      db.group_members,
      db.snobs,
      db.group_attributes,
      db.group_invites,
      db.items,
      db.item_attributes,
    ],
    async () => {
      await db.groups.put({
        id: meta.group.id,
        name: meta.group.name,
        description: meta.group.description,
        minRanking: meta.group.min_ranking,
        maxRanking: meta.group.max_ranking,
        increments: meta.group.increments,
        rankIcon: meta.group.rank_icon,
        rankingsRequired: meta.group.rankings_required,
        deleted: meta.group.deleted === 1,
        pictureUrl: meta.group.picture_url,
      } as LocalGroup);

      for (const s of meta.snobs) {
        await db.snobs.put({
          id: s.id,
          email: s.email,
          firstName: s.first_name,
          lastName: s.last_name,
          pictureUrl: s.picture_url,
          lastGroupId: s.last_group_id,
          isPremium: s.is_premium === 1,
        } as LocalSnob);
      }

      await db.group_members.where("groupId").equals(groupId).delete();
      await db.group_members.bulkPut(
        meta.members.map(
          (m) =>
            ({
              id: m.id,
              groupId: m.group_id,
              snobId: m.snob_id,
              role: m.role,
            }) as LocalGroupMember,
        ),
      );

      await db.group_attributes.where("groupId").equals(groupId).delete();
      await db.group_attributes.bulkPut(
        meta.attributes.map(
          (a) =>
            ({
              id: a.id,
              groupId: a.group_id,
              name: a.name,
            }) as LocalGroupAttribute,
        ),
      );

      await db.group_invites.where("groupId").equals(groupId).delete();
      await db.group_invites.bulkPut(
        meta.invites.map(
          (inv) =>
            ({
              id: inv.id,
              groupId: inv.group_id,
              email: inv.email,
              status: inv.status,
            }) as LocalGroupInvite,
        ),
      );

      // Drop values for attributes the group no longer has.
      const liveAttributeIds = new Set(meta.attributes.map((a) => a.id));
      const itemIds = (await db.items
        .where("groupId")
        .equals(groupId)
        .primaryKeys()) as string[];
      if (itemIds.length > 0) {
        await db.item_attributes
          .where("itemId")
          .anyOf(itemIds)
          .filter((ia) => !liveAttributeIds.has(ia.attributeId))
          .delete();
      }
    },
  );

  return meta;
}

/** Pages through every item, then prunes local items the server didn't return. */
async function syncGroupFull(
  groupId: string,
  meta: GroupMetaResponse,
): Promise<void> {
  const db = currentDexieDb();
  await db.sync_meta.put({
    groupId,
    complete: false,
    highestPageSynced: 0,
    totalItems: meta.totalItems,
    lastSyncedAt: new Date().toISOString(),
    state: null,
  } as LocalSyncMeta);

  const seen = new Set<string>();
  let page = 1;
  let complete = false;
  while (!complete) {
    const itemsRes = await fetch(
      `/api/offline/groups/${encodeURIComponent(groupId)}/items?page=${page}&pageSize=${PAGE_SIZE}`,
    );
    // Stays incomplete; the next visit re-mirrors.
    if (!itemsRes.ok) return;
    const data: GroupItemsPageResponse = await itemsRes.json();
    for (const item of data.items) seen.add(item.id);
    complete = data.complete;

    await db.transaction(
      "rw",
      [db.items, db.item_attributes, db.rankings, db.sync_meta],
      async () => {
        // Replace attributes/rankings per item so removed ones don't linger.
        const ids = data.items.map((i) => i.id);
        if (ids.length > 0) {
          await db.item_attributes.where("itemId").anyOf(ids).delete();
          await db.rankings.where("itemId").anyOf(ids).delete();
        }
        await db.items.bulkPut(data.items.map(toLocalItem));
        await db.item_attributes.bulkPut(
          data.itemAttributes.map(toLocalItemAttribute),
        );
        await db.rankings.bulkPut(data.rankings.map(toLocalRanking));

        if (complete) {
          // Items deleted on the server since the last mirror.
          const localIds = (await db.items
            .where("groupId")
            .equals(groupId)
            .primaryKeys()) as string[];
          await deleteItems(localIds.filter((id) => !seen.has(id)));
        }

        await db.sync_meta.put({
          groupId,
          complete,
          highestPageSynced: page,
          totalItems: data.total,
          lastSyncedAt: new Date().toISOString(),
          // The cursor is only meaningful once every page is in.
          state: complete ? cursorState(meta.serverTime) : null,
        } as LocalSyncMeta);
      },
    );
    page += 1;
  }
}

/**
 * Applies `/changes` since the stored cursor. Returns false when the server
 * says the delta is too large, so the caller can fall back to a full mirror.
 */
async function syncGroupChanges(
  groupId: string,
  cursor: string,
): Promise<boolean> {
  const db = currentDexieDb();
  const since = new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString();
  const res = await fetch(
    `/api/offline/groups/${encodeURIComponent(groupId)}/changes?since=${encodeURIComponent(since)}`,
  );
  if (!res.ok) throw new Error(`changes ${res.status}`);
  const data: GroupChangesResponse = await res.json();
  if (data.tooMany) return false;

  await db.transaction(
    "rw",
    [db.items, db.item_attributes, db.rankings, db.sync_meta],
    async () => {
      const changedIds = data.items.map((i) => i.id);
      if (changedIds.length > 0) {
        await db.item_attributes.where("itemId").anyOf(changedIds).delete();
        await db.rankings.where("itemId").anyOf(changedIds).delete();
      }
      await db.items.bulkPut(data.items.map(toLocalItem));
      await db.item_attributes.bulkPut(
        data.itemAttributes.map(toLocalItemAttribute),
      );
      await db.rankings.bulkPut(data.rankings.map(toLocalRanking));

      const live = new Set(data.itemIds);
      const localIds = (await db.items
        .where("groupId")
        .equals(groupId)
        .primaryKeys()) as string[];
      await deleteItems(localIds.filter((id) => !live.has(id)));

      const existing = await db.sync_meta.get(groupId);
      await db.sync_meta.put({
        groupId,
        complete: true,
        highestPageSynced: existing?.highestPageSynced ?? 0,
        totalItems: data.itemIds.length,
        lastSyncedAt: new Date().toISOString(),
        state: cursorState(data.cursor),
      } as LocalSyncMeta);
    },
  );
  return true;
}

export async function syncGroupDexie(groupId: string): Promise<void> {
  const db = currentDexieDb();
  const meta = await syncGroupMeta(groupId);

  const state = await db.sync_meta.get(groupId);
  const cursor = state?.complete ? readCursor(state) : null;
  if (cursor && (await syncGroupChanges(groupId, cursor))) return;

  await syncGroupFull(groupId, meta);
}
