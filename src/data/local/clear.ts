/**
 * Removes all on-device offline data for the current user.
 *
 * Used when logging out and when a different account signs in on the same
 * device, so a shared browser never exposes one user's cached groups to
 * another. The SQLite file itself stays on disk (OPFS file deletion is not
 * exposed by the worker), but every row is removed, which is what matters for
 * privacy.
 */

// Using Dexie only now
import { dexieDbNameFor, resetDexieDb } from "./dexie-db";
import { getOfflineDbName } from "./identity";

/** Dependents first, so the wipe is safe even if FKs are ever enabled. */

/** Runtime caches that hold user-specific content (e.g. Cloudinary images). */
const RUNTIME_CACHES = ["cloudinary-images", "next-image"] as const;

export async function clearOfflineData(): Promise<void> {
  try {
    resetDexieDb();
  } catch {
    // ignore
  }
  if (typeof indexedDB !== "undefined") {
    try {
      indexedDB.deleteDatabase(dexieDbNameFor(getOfflineDbName()));
    } catch {
      // ignore
    }
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
    resetDexieDb();
  } catch {
    // ignore
  }
  if (typeof indexedDB !== "undefined") {
    try {
      indexedDB.deleteDatabase(dexieDbNameFor(dbName));
    } catch {
      // ignore
    }
  }
}
