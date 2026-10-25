/**
 * Removes all on-device offline data for the current user.
 *
 * Used when logging out and when a different account signs in on the same
 * device, so a shared browser never exposes one user's cached groups to
 * another. The SQLite file itself stays on disk (OPFS file deletion is not
 * exposed by the worker), but every row is removed, which is what matters for
 * privacy.
 */

import { sqliteClient } from "./sqlite-client";

/** Dependents first, so the wipe is safe even if FKs are ever enabled. */
const TABLES = [
  "rankings",
  "item_attributes",
  "items",
  "group_invites",
  "group_attributes",
  "group_members",
  "groups",
  "snobs",
  "sync_meta",
] as const;

/** Runtime caches that hold user-specific content (e.g. Cloudinary images). */
const RUNTIME_CACHES = ["cloudinary-images", "next-image"] as const;

export async function clearOfflineData(): Promise<void> {
  try {
    await sqliteClient.init();
    for (const table of TABLES) {
      await sqliteClient.exec(`DELETE FROM ${table}`);
    }
  } catch {
    // Nothing to clear (no mirror on this device) — not an error for the caller.
  }

  if (typeof caches !== "undefined") {
    await Promise.all(
      RUNTIME_CACHES.map((name) => caches.delete(name).catch(() => false)),
    );
  }
}

/**
 * Wipes the mirror belonging to a specific user, then leaves the client ready
 * to open another database.
 */
export async function clearOfflineDataFor(dbName: string): Promise<void> {
  try {
    await sqliteClient.init(dbName);
    for (const table of TABLES) {
      await sqliteClient.exec(`DELETE FROM ${table}`);
    }
  } catch {
    // Ignore: a missing/never-created database has nothing to wipe.
  } finally {
    sqliteClient.reset();
  }
}
