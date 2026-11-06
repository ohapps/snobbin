/**
 * Offline support is always enabled (using IndexedDB/Dexie).
 */
export const OFFLINE_ENABLED = true;

/**
 * Name of the local SQLite file for a given user.
 *
 * The mirror is namespaced per Auth0 `sub` so that two accounts sharing a
 * device never read each other's cached groups. Kept in sync with
 * `src/data/local/sqlite-client.ts`.
 */
export function offlineDbNameFor(sub: string | null | undefined): string {
  if (!sub) return "snobbin-offline-anonymous.sqlite3";
  const safe = sub.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `snobbin-offline-${safe}.sqlite3`;
}
/* force Wed Oct 28 21:29:17 CDT 2026 */
