import Dexie, { Table } from "dexie";
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

let currentDb: SnobbinOfflineDB | null = null;
let currentDbName: string | null = null;

export function getDexieDb(name: string): SnobbinOfflineDB {
  try {
    if (currentDb && currentDbName === name) {
      // Check if db is closed
      const dbAny = currentDb as unknown as { isOpen?: () => boolean };
      if (dbAny.isOpen?.() === false) {
        currentDb = null;
        currentDbName = null;
      } else {
        return currentDb;
      }
    }
    if (currentDb) {
      try {
        currentDb.close();
      } catch {
        // ignore
      }
    }
    currentDb = new SnobbinOfflineDB(name);
    currentDbName = name;
    return currentDb;
  } catch {
    currentDb = null;
    currentDbName = null;
    currentDb = new SnobbinOfflineDB(name);
    currentDbName = name;
    return currentDb;
  }
}

export function resetDexieDb() {
  try {
    if (currentDb) {
      try {
        currentDb.close();
      } catch {
        // ignore
      }
      currentDb = null;
      currentDbName = null;
    }
  } catch {
    currentDb = null;
    currentDbName = null;
  }
}
