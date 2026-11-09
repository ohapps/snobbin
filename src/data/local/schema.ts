/**
 * Row types for the offline read-only mirror (IndexedDB via Dexie).
 *
 * These mirror the read models of the server schema (`src/server/db/schema.ts`),
 * limited to what the offline read experience renders. Table names and indexes
 * live in `dexie-db.ts`.
 *
 * Notes vs. the Postgres schema:
 *  - UUIDs and dates are strings (dates are ISO-8601, matching
 *    `mobile-formatters.ts`).
 *  - Numeric columns are plain numbers so ranking sort/filter works.
 */

export interface LocalGroup {
  id: string;
  name: string;
  description: string;
  minRanking: number;
  maxRanking: number;
  increments: number;
  rankIcon: string;
  rankingsRequired: number;
  deleted: boolean;
  pictureUrl: string | null;
}

export interface LocalSnob {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
  lastGroupId: string | null;
  isPremium: boolean;
}

export interface LocalGroupMember {
  id: string;
  groupId: string;
  snobId: string;
  role: string;
}

export interface LocalGroupInvite {
  id: string;
  groupId: string;
  email: string;
  status: string;
}

export interface LocalGroupAttribute {
  id: string;
  groupId: string;
  name: string;
}

export interface LocalItem {
  id: string;
  groupId: string;
  description: string;
  ranked: boolean;
  /** Nullable like the server. */
  averageRanking: number | null;
  imageId: string | null;
  imageUrl: string | null;
  /** ISO-8601 string, matching `formatItemResponse`. */
  createdDate: string | null;
  updatedDate: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface LocalItemAttribute {
  id: string;
  itemId: string;
  attributeId: string;
  attributeValue: string;
}

export interface LocalRanking {
  id: string;
  itemId: string;
  groupMemberId: string;
  ranking: number;
  notes: string | null;
  createdDate: string | null;
  updatedDate: string | null;
}

/**
 * Per-group sync bookkeeping. Drives incremental sync and lets the UI show
 * what is available offline. See docs/OFFLINE_PLAN.md › Sync.
 */
export interface LocalSyncMeta {
  groupId: string;
  /** ISO-8601 timestamp of the last successful sync touch. */
  lastSyncedAt: string | null;
  /** True once every page of items has been mirrored. */
  complete: boolean;
  /** Highest item page mirrored by the current full sync (1-based). */
  highestPageSynced: number;
  /** Total items reported by the server for this group, for progress UI. */
  totalItems: number | null;
  /** JSON blob of per-group sync state (the `/changes` cursor). */
  state: string | null;
}
