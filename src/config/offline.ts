/**
 * Offline support is always enabled (using IndexedDB/Dexie).
 */
export const OFFLINE_ENABLED = true;

/**
 * IndexedDB database name for a given user's offline mirror.
 *
 * The mirror is namespaced per Auth0 `sub` so that two accounts sharing a
 * device never read each other's cached groups. Changing this format orphans
 * existing mirrors (they would re-sync under the new name).
 */
export function offlineDbNameFor(sub: string | null | undefined): string {
  if (!sub) return "snobbin-offline-anonymous.db";
  const safe = sub.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `snobbin-offline-${safe}.db`;
}
