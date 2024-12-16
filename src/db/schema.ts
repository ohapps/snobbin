import { boolean, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const snobsTable = pgTable('snobs', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    pictureUrl: text('picture_url'),
});

export type InsertSnob = typeof snobsTable.$inferInsert;
export type SelectSnob = typeof snobsTable.$inferSelect;

export const snobGroupsTable = pgTable('snob_groups', {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    minRanking: numeric('min_ranking').notNull(),
    maxRanking: numeric('max_ranking').notNull(),
    increments: numeric('increments').notNull(),
    rankIcon: text('rank_icon').notNull(),
    rankingsRequired: numeric('rankings_required').notNull(),
    deleted: boolean('deleted').notNull().default(false),
});

export type InsertSnobGroup = typeof snobGroupsTable.$inferInsert;
export type SelectSnobGroup = typeof snobGroupsTable.$inferSelect;

export const snobGroupMembersTable = pgTable('snob_group_members', {
    id: uuid('id').primaryKey(),
    groupId: uuid('group_id').notNull(),
    snobId: text('snob_id').notNull(),
    role: text('role').notNull()
});

export type InsertSnobGroupMember = typeof snobGroupMembersTable.$inferInsert;
export type SelectSnobGroupMember = typeof snobGroupMembersTable.$inferSelect;

export const snobGroupInvitesTable = pgTable('snob_group_invites', {
    id: uuid('id').primaryKey(),
    groupId: uuid('group_id').notNull(),
    email: text('email').notNull(),
    status: text('status').notNull()
});

export type InsertSnobGroupInvites = typeof snobGroupInvitesTable.$inferInsert;
export type SelectSnobGroupInvites = typeof snobGroupInvitesTable.$inferSelect;