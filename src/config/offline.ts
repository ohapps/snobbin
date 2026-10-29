/**
 * Build-time feature flags for the offline (read-only mirror) experiment.
 *
 * The offline feature can be disabled instantly by unsetting / falsifying
 * `NEXT_PUBLIC_OFFLINE_ENABLED` and redeploying. All offline code paths must
 * check `OFFLINE_ENABLED` before doing anything.
 *
 * See `docs/OFFLINE_PLAN.md`.
 */
export const OFFLINE_ENABLED =
  process.env.NEXT_PUBLIC_OFFLINE_ENABLED === "true";

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
