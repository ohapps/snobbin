import Dexie, { Table } from "dexie";
import { getOfflineDbName } from "./identity";
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

export class SnobbinOfflineDB extends Dexie {
  groups!: Table<LocalGroup, string>;
  snobs!: Table<LocalSnob, string>;
  group_members!: Table<LocalGroupMember, string>;
  group_invites!: Table<LocalGroupInvite, string>;
  group_attributes!: Table<LocalGroupAttribute, string>;
  items!: Table<LocalItem, string>;
  item_attributes!: Table<LocalItemAttribute, string>;
  rankings!: Table<LocalRanking, string>;
  sync_meta!: Table<LocalSyncMeta, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      groups: "id, name",
      snobs: "id, email",
      group_members: "id, groupId, snobId",
      group_invites: "id, groupId, email",
      group_attributes: "id, groupId, name",
      items: "id, groupId, ranked, averageRanking, description",
      item_attributes: "id, itemId, attributeId, attributeValue",
      rankings: "id, itemId, groupMemberId",
      sync_meta: "groupId",
    });
  }
}

/**
 * One Dexie instance per database name.
 *
 * Instances are never closed just because a *different* name was requested:
 * in Dexie 4, `close()` defaults to `disableAutoOpen: true`, so any code still
 * holding the old instance would fail with `DatabaseClosedError` from then on.
 * Only `resetDexieDb()` (identity change / clear) closes connections.
 */
const instances = new Map<string, SnobbinOfflineDB>();

export function getDexieDb(name: string): SnobbinOfflineDB {
  let db = instances.get(name);
  if (!db) {
    db = new SnobbinOfflineDB(name);
    instances.set(name, db);
  }
  return db;
}

/** The mirror for the currently remembered identity. */
export function currentDexieDb(): SnobbinOfflineDB {
  return getDexieDb(getOfflineDbName());
}

/** Closes every open mirror so the next query (or a deleteDatabase) starts clean. */
export function resetDexieDb() {
  instances.forEach((db) => {
    try {
      db.close();
    } catch {
      // ignore
    }
  });
  instances.clear();
}
