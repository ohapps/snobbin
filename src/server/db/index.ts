import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

/**
 * One connection pool per server process.
 *
 * `next dev` re-evaluates this module on every hot reload. Creating a new pool
 * each time leaks the old one's connections until Postgres refuses new ones
 * ("sorry, too many clients already"), so in development the pool is kept on
 * `globalThis`, which survives reloads. Production evaluates the module once.
 */
const globalForDb = globalThis as unknown as {
  snobbinPgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.snobbinPgClient ?? postgres(process.env.DATABASE_URL!);

if (process.env.NODE_ENV !== "production") {
  globalForDb.snobbinPgClient = client;
}

export const db = drizzle(client, { logger: false });
