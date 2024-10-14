import { pgTable, text } from "drizzle-orm/pg-core";

export const snobsTable = pgTable('snobs', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    pictureUrl: text('picture_url'),
});

export type InsertSnob = typeof snobsTable.$inferInsert;
export type SelectSnob = typeof snobsTable.$inferSelect;