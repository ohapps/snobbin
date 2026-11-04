import { getDexieDb } from "./dexie-db";
import {
  getOfflineDbName,
  getRememberedSnobId,
  setRememberedSnobId,
} from "./identity";
import type {
  BootstrapResponse,
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
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));
  const snobId = getRememberedSnobId();
  console.warn("[dexie-sync] bootstrap start, snobId:", snobId, "db:", dbName);
  if (!snobId) {
    try {
      const anonDb = getDexieDb("snobbin-offline-anonymous.db");
      const res2 = await fetch("/api/offline/bootstrap");
      console.warn("[dexie-sync] bootstrap resp anon:", res2.status);
      if (!res2.ok) return { ok: false, reason: `http-${res2.status}` };
      const data2: BootstrapResponse = await res2.json();
      console.warn(
        "[dexie-sync] bootstrap data groups anon:",
        data2.groups?.length,
      );
      await db.transaction(
        "rw",
        [anonDb.snobs, anonDb.groups, anonDb.group_members],
        async () => {
          await anonDb.snobs.put({
            id: data2.snob.id,
            email: data2.snob.email,
            firstName: data2.snob.first_name,
            lastName: data2.snob.last_name,
            pictureUrl: data2.snob.picture_url,
            lastGroupId: data2.snob.last_group_id,
            isPremium: data2.snob.is_premium === 1,
          } as LocalSnob);
          for (const s of data2.snobs) {
            await anonDb.snobs.put({
              id: s.id,
              email: s.email,
              firstName: s.first_name,
              lastName: s.last_name,
              pictureUrl: s.picture_url,
              lastGroupId: s.last_group_id,
              isPremium: s.is_premium === 1,
            } as LocalSnob);
          }
          console.warn(
            "[dexie-sync] writing groups anon:",
            data2.groups?.length,
          );
          for (const g of data2.groups) {
            console.warn("[dexie-sync] group anon:", g.id, g.name);
            await anonDb.groups.put({
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
          for (const m of data2.memberships) {
            await anonDb.group_members.put({
              id: m.id,
              groupId: m.group_id,
              snobId: m.snob_id,
              role: m.role,
            } as LocalGroupMember);
          }
        },
      );
      for (const g of data2.groups) {
        const existing = await anonDb.sync_meta.get(g.id);
        if (!existing) {
          await anonDb.sync_meta.put({
            groupId: g.id,
            complete: false,
            highestPageSynced: 0,
            totalItems: null,
            lastSyncedAt: null,
            state: null,
          } as LocalSyncMeta);
        }
      }
      try {
        setRememberedSnobId(data2.snob.id);
      } catch {
        // ignore
      }
      console.warn("[dexie-sync] bootstrap anon done");
      return { ok: true };
    } catch (e) {
      console.warn("[dexie-sync] anon bootstrap err", e);
      return { ok: false, reason: "no-identity" };
    }
  }

  try {
    const res = await fetch("/api/offline/bootstrap");
    console.warn("[dexie-sync] bootstrap resp:", res.status);
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    const data: BootstrapResponse = await res.json();
    console.warn("[dexie-sync] bootstrap data groups:", data.groups?.length);

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
    try {
      setRememberedSnobId(data.snob.id);
    } catch {
      // ignore
    }

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
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, reason: "error" };
  }
}

export async function syncGroupDexie(groupId: string): Promise<void> {
  const dbName = getOfflineDbName();
  const db = getDexieDb(dbName.replace(/\.sqlite3$/, ".db"));

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
      for (const m of meta.members) {
        await db.group_members.put({
          id: m.id,
          groupId: m.group_id,
          snobId: m.snob_id,
          role: m.role,
        } as LocalGroupMember);
      }
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
      for (const a of meta.attributes) {
        await db.group_attributes.put({
          id: a.id,
          groupId: a.group_id,
          name: a.name,
        } as LocalGroupAttribute);
      }
      for (const inv of meta.invites) {
        await db.group_invites.put({
          id: inv.id,
          groupId: inv.group_id,
          email: inv.email,
          status: inv.status,
        } as LocalGroupInvite);
      }
    },
  );

  await db.sync_meta.put({
    groupId,
    complete: false,
    highestPageSynced: 0,
    totalItems: meta.totalItems,
    lastSyncedAt: new Date().toISOString(),
    state: null,
  } as LocalSyncMeta);

  let page = 1;
  const pageSize = 20;
  let complete = false;
  while (!complete) {
    const itemsRes = await fetch(
      `/api/offline/groups/${encodeURIComponent(groupId)}/items?page=${page}&pageSize=${pageSize}`,
    );
    if (!itemsRes.ok) break;
    const data: GroupItemsPageResponse = await itemsRes.json();

    await db.transaction(
      "rw",
      [db.items, db.item_attributes, db.rankings, db.sync_meta],
      async () => {
        for (const item of data.items) {
          await db.items.put({
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
          } as LocalItem);
        }
        for (const ia of data.itemAttributes) {
          await db.item_attributes.put({
            id: ia.id,
            itemId: ia.item_id,
            attributeId: ia.attribute_id,
            attributeValue: ia.attribute_value,
          } as LocalItemAttribute);
        }
        for (const r of data.rankings) {
          await db.rankings.put({
            id: r.id,
            itemId: r.item_id,
            groupMemberId: r.group_member_id,
            ranking: r.ranking,
            notes: r.notes,
            createdDate: r.created_date,
            updatedDate: r.updated_date,
          } as LocalRanking);
        }
      },
    );

    complete = data.complete;
    await db.sync_meta.put({
      groupId,
      complete: complete,
      highestPageSynced: page,
      totalItems: data.total,
      lastSyncedAt: new Date().toISOString(),
      state: null,
    } as LocalSyncMeta);
    if (!complete) {
      page += 1;
    }
  }
}
