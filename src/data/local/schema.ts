/**
 * Client-side SQLite schema for the offline read-only mirror.
 *
 * This mirrors the read models of the server schema (`src/server/db/schema.ts`)
 * but is a *separate* SQLite schema. Only the tables needed to render the
 * offline read experience are included.
 *
 * Notes vs. the Postgres schema:
 *  - SQLite has no `numeric`/`uuid`/`boolean` types; we store numbers as
 *    `integer`/`real`, booleans as `integer` (0/1), and UUIDs/dates as `text`
 *    (ISO-8601 for dates, matching `mobile-formatters.ts`).
 *  - `averageRanking` is stored as `real` to allow sorting.
 */

import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const groupsTable = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minRanking: real("min_ranking").notNull(),
  maxRanking: real("max_ranking").notNull(),
  increments: real("increments").notNull(),
  rankIcon: text("rank_icon").notNull(),
  rankingsRequired: real("rankings_required").notNull(),
  deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  pictureUrl: text("picture_url"),
});

export type LocalGroup = typeof groupsTable.$inferSelect;

export const snobsTable = sqliteTable("snobs", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  pictureUrl: text("picture_url"),
  lastGroupId: text("last_group_id"),
  isPremium: integer("is_premium", { mode: "boolean" })
    .notNull()
    .default(false),
});

export type LocalSnob = typeof snobsTable.$inferSelect;

export const groupMembersTable = sqliteTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    snobId: text("snob_id").notNull(),
    role: text("role").notNull(),
  },
  (table) => ({
    groupIdx: index("group_members_group_idx").on(table.groupId),
  }),
);

export type LocalGroupMember = typeof groupMembersTable.$inferSelect;

export const groupInvitesTable = sqliteTable(
  "group_invites",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    email: text("email").notNull(),
    status: text("status").notNull(),
  },
  (table) => ({
    groupIdx: index("group_invites_group_idx").on(table.groupId),
  }),
);

export type LocalGroupInvite = typeof groupInvitesTable.$inferSelect;

export const groupAttributesTable = sqliteTable(
  "group_attributes",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    name: text("name").notNull(),
  },
  (table) => ({
    groupIdx: index("group_attributes_group_idx").on(table.groupId),
  }),
);

export type LocalGroupAttribute = typeof groupAttributesTable.$inferSelect;

export const itemsTable = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    description: text("description").notNull(),
    ranked: integer("ranked", { mode: "boolean" }).notNull(),
    /** Stored as `real` so ranking sort/filter works; nullable like the server. */
    averageRanking: real("average_ranking"),
    imageId: text("image_id"),
    imageUrl: text("image_url"),
    /** ISO-8601 string, matching `formatItemResponse`. */
    createdDate: text("created_date"),
    updatedDate: text("updated_date"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  },
  (table) => ({
    groupIdx: index("items_group_idx").on(table.groupId),
    groupRankedIdx: index("items_group_ranked_idx").on(
      table.groupId,
      table.ranked,
    ),
    groupDescriptionIdx: index("items_group_description_idx").on(
      table.groupId,
      table.description,
    ),
  }),
);

export type LocalItem = typeof itemsTable.$inferSelect;

export const itemAttributesTable = sqliteTable(
  "item_attributes",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    attributeId: text("attribute_id").notNull(),
    attributeValue: text("attribute_value").notNull(),
  },
  (table) => ({
    itemIdx: index("item_attributes_item_idx").on(table.itemId),
    attributeIdx: index("item_attributes_attribute_idx").on(
      table.attributeId,
      table.attributeValue,
    ),
  }),
);

export type LocalItemAttribute = typeof itemAttributesTable.$inferSelect;

export const rankingsTable = sqliteTable(
  "rankings",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    groupMemberId: text("group_member_id").notNull(),
    ranking: real("ranking").notNull(),
    notes: text("notes"),
    createdDate: text("created_date"),
    updatedDate: text("updated_date"),
  },
  (table) => ({
    itemIdx: index("rankings_item_idx").on(table.itemId),
  }),
);

export type LocalRanking = typeof rankingsTable.$inferSelect;

/**
 * Per-group sync bookkeeping. Drives resumable / progressive sync and lets the
 * UI show what is available offline.
 */
export const syncMetaTable = sqliteTable("sync_meta", {
  groupId: text("group_id").primaryKey(),
  /** ISO-8601 timestamp of the last successful sync touch. */
  lastSyncedAt: text("last_synced_at"),
  /** 1 once every page of items has been mirrored. */
  complete: integer("complete", { mode: "boolean" }).notNull().default(false),
  /** Highest item page successfully mirrored so far (1-based). */
  highestPageSynced: integer("highest_page_synced").notNull().default(0),
  /** Total items reported by the server for this group, for progress UI. */
  totalItems: integer("total_items"),
  /** JSON blob for future per-group sync state without a migration. */
  state: text("state"),
});

export type LocalSyncMeta = typeof syncMetaTable.$inferSelect;
