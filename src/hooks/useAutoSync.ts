"use client";

import { useEffect } from "react";
import { syncBootstrap, syncGroup } from "@/data/local/sync";
import { getGroupSyncState } from "@/data/local/repositories";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useOfflineIdentity } from "@/hooks/useOfflineIdentity";

/**
 * Background mirror fill.
 *
 * When a group page is viewed online we quietly mirror the whole group into the
 * local SQLite database so it is readable offline later, with no explicit user
 * action. See docs/OFFLINE_PLAN.md §4 Phase 2 ("progressive fill").
 *
 * Properties that matter here:
 *  - **Non-blocking.** Never awaited by the render path; the online page render
 *    is unaffected.
 *  - **Idempotent.** A group already fully mirrored is skipped, and concurrent
 *    runs for the same group are deduped via a module-level map, so navigating
 *    back and forth does not restart a multi-second sync.
 *  - **Resumable.** A partially mirrored group resumes from `highestPageSynced`
 *    rather than restarting.
 *  - **Cancellable.** Aborts when the page unmounts, so a pager is not left
 *    running against a group the user has left.
 *
 * Bootstrap (identity + groups) runs once per session, before the first group
 * sync, because the read path needs the group row to exist locally.
 */

/** In-flight/resolved syncs, keyed by group id, so runs are deduped per tab. */
const activeSyncs = new Map<string, Promise<void>>();
let bootstrapPromise: Promise<void> | null = null;
let bootstrapSyncedAt = 0;
let persistRequested = false;

/**
 * How long a fully-mirrored group is considered fresh. After this we re-mirror
 * from page 1 in the background so offline data does not drift indefinitely.
 */
const SYNC_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Ask the browser to keep our storage. Without this the mirror is "best effort"
 * and can be evicted under storage pressure (and on Safari after ~7 days of
 * non-use), which would silently disable offline reading.
 */
function requestPersistentStorage(): void {
  if (persistRequested) return;
  persistRequested = true;
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  navigator.storage.persist().catch(() => {
    // Not fatal: the mirror still works, it is just evictable.
  });
}

/**
 * How long bootstrap (identity, groups, memberships, invites) is considered
 * fresh. Without this a long-lived tab would never see groups created on
 * another device. Reconnects force a refresh regardless.
 */
const BOOTSTRAP_TTL_MS = 15 * 60 * 1000;

/** Runs bootstrap at most once per TTL, and dedupes concurrent callers. */
function ensureBootstrap(force = false): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  if (
    !force &&
    bootstrapSyncedAt > 0 &&
    Date.now() - bootstrapSyncedAt < BOOTSTRAP_TTL_MS
  ) {
    return Promise.resolve();
  }

  const run = syncBootstrap().then(() => {
    bootstrapSyncedAt = Date.now();
  });
  bootstrapPromise = run;
  // Clear the in-flight marker once settled: on success the TTL takes over, and
  // on failure a later attempt (next navigation or reconnect) may retry.
  run
    .catch(() => {
      bootstrapSyncedAt = 0;
    })
    .finally(() => {
      if (bootstrapPromise === run) bootstrapPromise = null;
    });
  return run;
}

/**
 * Forces the next bootstrap sync to re-fetch. Used when connectivity returns:
 * groups, memberships, and invites may have changed while offline.
 */
export function refreshBootstrap(): Promise<void> {
  // A sync already in flight is at least as fresh as one we would start now.
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapSyncedAt = 0;
  return ensureBootstrap(true);
}

/**
 * Mirrors one group, resuming if partial. Resolves when the group is complete,
 * or rejects on error. Failures are non-fatal: the app simply stays online-only
 * for that group.
 */
async function mirrorGroup(groupId: string, signal: AbortSignal): Promise<void> {
  const state = await getGroupSyncState(groupId);

  // Skip only if the mirror is complete *and* recent. A stale mirror is
  // re-mirrored so offline data does not drift indefinitely.
  const fresh =
    state?.complete === true &&
    state.lastSyncedAt !== null &&
    Date.now() - Date.parse(state.lastSyncedAt) < SYNC_TTL_MS;
  if (fresh) return;

  requestPersistentStorage();
  await ensureBootstrap();

  // A complete-but-stale group must restart from page 1: resuming would start
  // past the last page and refresh nothing. An incomplete group resumes.
  const fromStart = state?.complete === true;

  await syncGroup(groupId, {
    fromStart,
    signal,
    onProgress: (progress) => {
      if (process.env.NODE_ENV !== "production" && progress.done) {
        console.debug(
          `[offline] mirrored group ${groupId}: ${progress.totalItems} items`,
        );
      }
    },
  });
}

export function useAutoSync(
  groupId: string | undefined,
  options: { enabled?: boolean } = {},
): void {
  const { online, ready } = useConnectivity();
  const sub = useOfflineIdentity();
  const enabled = options.enabled ?? true;

  useEffect(() => {
    // `sub` gates the sync: the mirror is namespaced per user, and we must not
    // write into the anonymous database before the identity is known.
    if (!enabled || !groupId || !ready || !online || !sub) return;

    // Dedupe: reuse an in-flight sync for this group rather than starting a
    // second pager over the same data.
    const existing = activeSyncs.get(groupId);
    if (existing) return;

    const controller = new AbortController();
    const run = mirrorGroup(groupId, controller.signal)
      .catch((error) => {
        // Offline, a mid-sync failure, or an aborted navigation are all
        // expected; the group stays online-only and will retry on next visit.
        if (controller.signal.aborted) return;
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[offline] background sync failed for ${groupId}`, error);
        }
      })
      .finally(() => {
        activeSyncs.delete(groupId);
      });

    activeSyncs.set(groupId, run);

    return () => {
      controller.abort();
      activeSyncs.delete(groupId);
    };
  }, [groupId, enabled, online, ready, sub]);
}

/** Test/reset helper: clears dedupe state between runs. */
export function __resetAutoSyncState(): void {
  activeSyncs.clear();
  bootstrapPromise = null;
  bootstrapSyncedAt = 0;
}
