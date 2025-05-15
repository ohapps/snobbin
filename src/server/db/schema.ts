import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const snobGroupsTable = pgTable("snob_groups", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minRanking: numeric("min_ranking").notNull(),
  maxRanking: numeric("max_ranking").notNull(),
  increments: numeric("increments").notNull(),
  rankIcon: text("rank_icon").notNull(),
  rankingsRequired: numeric("rankings_required").notNull(),
  deleted: boolean("deleted").notNull().default(false),
});

export type InsertSnobGroup = typeof snobGroupsTable.$inferInsert;
export type SelectSnobGroup = typeof snobGroupsTable.$inferSelect;

export const snobsTable = pgTable("snobs", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  pictureUrl: text("picture_url"),
  lastGroupId: uuid("last_group_id").references(() => snobGroupsTable.id)
});

export type InsertSnob = typeof snobsTable.$inferInsert;
export type SelectSnob = typeof snobsTable.$inferSelect;

export const snobGroupMembersTable = pgTable("snob_group_members", {
  id: uuid("id").primaryKey(),
  groupId: uuid("group_id").notNull(),
  snobId: text("snob_id").notNull(),
  role: text("role").notNull(),
});

export type InsertSnobGroupMember = typeof snobGroupMembersTable.$inferInsert;
export type SelectSnobGroupMember = typeof snobGroupMembersTable.$inferSelect;

export const snobGroupInvitesTable = pgTable("snob_group_invites", {
  id: uuid("id").primaryKey(),
  groupId: uuid("group_id").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull(),
});

export type InsertSnobGroupInvites = typeof snobGroupInvitesTable.$inferInsert;
export type SelectSnobGroupInvites = typeof snobGroupInvitesTable.$inferSelect;

export const snobGroupAttributesTable = pgTable("snob_group_attributes", {
  id: uuid("id").primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => snobGroupsTable.id),
  name: text("name").notNull(),
});

export type InsertSnobGroupAttributes =
  typeof snobGroupAttributesTable.$inferInsert;
export type SelectSnobGroupAttributes =
  typeof snobGroupAttributesTable.$inferSelect;

export const rankingItemsTable = pgTable("ranking_items", {
  id: uuid("id").primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => snobGroupsTable.id),
  description: text("description").notNull(),
  ranked: boolean("ranked").notNull(),
  averageRanking: numeric("average_ranking"),
  imageId: text("image_id"),
  imageUrl: text("image_url"),
  createdDate: timestamp("created_date").notNull().defaultNow(),
  updatedDate: timestamp("updated_date").notNull().defaultNow(),
  createdBy: text("created_by").references(() => snobsTable.id),
  updatedBy: text("updated_by").references(() => snobsTable.id),
});

export type InsertRankingItems = typeof rankingItemsTable.$inferInsert;
export type SelectRankingItems = typeof rankingItemsTable.$inferSelect;

export const rankingItemAttributesTable = pgTable("ranking_item_attributes", {
  id: uuid("id").primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => rankingItemsTable.id),
  attributeId: uuid("attribute_id")
    .notNull()
    .references(() => snobGroupAttributesTable.id),
  attributeValue: text("attribute_value").notNull(),
});

export type InsertRankingItemAttributes =
  typeof rankingItemAttributesTable.$inferInsert;
export type SelectRankingItemAttributes =
  typeof rankingItemAttributesTable.$inferSelect;

export const rankingsTable = pgTable("rankings", {
  id: uuid("id").primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => rankingItemsTable.id),
  groupMemberId: uuid("group_member_id")
    .notNull()
    .references(() => snobGroupMembersTable.id),
  ranking: numeric("ranking").notNull(),
  notes: text("notes"),
  createdDate: timestamp("created_date").notNull().defaultNow(),
  updatedDate: timestamp("updated_date").notNull().defaultNow(),
});

export type InsertRankings = typeof rankingsTable.$inferInsert;
export type SelectRankings = typeof rankingsTable.$inferSelect;
