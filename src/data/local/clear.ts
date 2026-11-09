/**
 * Removes all on-device offline data for the current user.
 *
 * Used when logging out and when a different account signs in on the same
 * device, so a shared browser never exposes one user's cached groups to
 * another. The whole IndexedDB database is deleted, along with runtime caches
 * that hold user content.
 */

import { resetDexieDb } from "./dexie-db";
import { getOfflineDbName } from "./identity";

/** Runtime caches that hold user-specific content (e.g. Cloudinary images). */
const RUNTIME_CACHES = [
  "cloudinary-images-v2",
  "cloudinary-images", // pre-v2 name; may still exist before the new worker activates
  "next-image",
] as const;

export async function clearOfflineData(): Promise<void> {
  try {
    resetDexieDb();
  } catch {
    // ignore
  }
  if (typeof indexedDB !== "undefined") {
    try {
      indexedDB.deleteDatabase(getOfflineDbName());
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
      indexedDB.deleteDatabase(dbName);
    } catch {
      // ignore
    }
  }
}
