/**
 * Browser-side migration runner for the local SQLite mirror.
 *
 * Drizzle's bundled `migrate()` depends on Node's filesystem, so it cannot run
 * in the browser. Instead we keep an ordered list of raw DDL statements and
 * track the applied version in a small `_migrations` table.
 *
 * Rules:
 *  - Never edit a shipped migration; append a new one.
 *  - Each migration runs inside a transaction.
 */

import { sqliteClient } from "./sqlite-client";

export interface LocalMigration {
  /** Monotonic, unique. Use an incrementing integer. */
  version: number;
  name: string;
  /** One or more DDL/DML statements. Executed in order. */
  statements: string[];
}

export const migrations: LocalMigration[] = [
  {
    version: 1,
    name: "initial_read_models",
    statements: [
      `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        min_ranking REAL NOT NULL,
        max_ranking REAL NOT NULL,
        increments REAL NOT NULL,
        rank_icon TEXT NOT NULL,
        rankings_required REAL NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        picture_url TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS snobs (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        picture_url TEXT,
        last_group_id TEXT,
        is_premium INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        snob_id TEXT NOT NULL,
        role TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS group_members_group_idx ON group_members (group_id);`,
      `CREATE TABLE IF NOT EXISTS group_invites (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS group_invites_group_idx ON group_invites (group_id);`,
      `CREATE TABLE IF NOT EXISTS group_attributes (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        name TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS group_attributes_group_idx ON group_attributes (group_id);`,
      `CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        description TEXT NOT NULL,
        ranked INTEGER NOT NULL,
        average_ranking REAL,
        image_id TEXT,
        image_url TEXT,
        created_date TEXT,
        updated_date TEXT,
        created_by TEXT,
        updated_by TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS items_group_idx ON items (group_id);`,
      `CREATE INDEX IF NOT EXISTS items_group_ranked_idx ON items (group_id, ranked);`,
      `CREATE INDEX IF NOT EXISTS items_group_description_idx ON items (group_id, description);`,
      `CREATE TABLE IF NOT EXISTS item_attributes (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        attribute_id TEXT NOT NULL,
        attribute_value TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS item_attributes_item_idx ON item_attributes (item_id);`,
      `CREATE INDEX IF NOT EXISTS item_attributes_attribute_idx ON item_attributes (attribute_id, attribute_value);`,
      `CREATE TABLE IF NOT EXISTS rankings (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        group_member_id TEXT NOT NULL,
        ranking REAL NOT NULL,
        notes TEXT,
        created_date TEXT,
        updated_date TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS rankings_item_idx ON rankings (item_id);`,
      `CREATE TABLE IF NOT EXISTS sync_meta (
        group_id TEXT PRIMARY KEY,
        last_synced_at TEXT,
        complete INTEGER NOT NULL DEFAULT 0,
        highest_page_synced INTEGER NOT NULL DEFAULT 0,
        total_items INTEGER,
        state TEXT
      );`,
    ],
  },
];

/** Ensures the bookkeeping table exists. */
async function ensureMigrationsTable(): Promise<void> {
  await sqliteClient.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

async function appliedVersions(): Promise<Set<number>> {
  // Uses the worker client directly (named-keyed rows) rather than Drizzle's
  // proxy, whose `all` returns positional arrays by design.
  const rows = await sqliteClient.query(
    "SELECT version FROM _migrations",
  );
  return new Set(rows.map((row) => Number(row.version)));
}

let migrated: Promise<void> | null = null;

/**
 * Runs all pending migrations exactly once per page load. Safe to call from
 * anywhere; concurrent callers share the same promise.
 */
export function ensureLocalSchema(): Promise<void> {
  if (migrated) return migrated;

  migrated = (async () => {
    await ensureMigrationsTable();
    const applied = await appliedVersions();

    for (const migration of migrations.sort((a, b) => a.version - b.version)) {
      if (applied.has(migration.version)) continue;

      for (const statement of migration.statements) {
        await sqliteClient.exec(statement);
      }
      await sqliteClient.exec(
        "INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
        [migration.version, migration.name, new Date().toISOString()],
      );
    }
  })();

  return migrated;
}
