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
  if (currentDb && currentDbName === name) {
    return currentDb;
  }
  if (currentDb) {
    currentDb.close();
  }
  currentDb = new SnobbinOfflineDB(name);
  currentDbName = name;
  return currentDb;
}

export function resetDexieDb() {
  if (currentDb) {
    currentDb.close();
    currentDb = null;
    currentDbName = null;
  }
}
