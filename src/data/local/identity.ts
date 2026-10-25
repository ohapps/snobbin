/**
 * Remembers which user the on-device mirror belongs to.
 *
 * The identity is kept in `localStorage` rather than in SQLite because it is
 * needed *before* the database can be opened (the DB file name is derived from
 * it) and because it must be readable with no network, when `/api/auth/me` is
 * unreachable. `localStorage` is synchronous and persists offline.
 *
 * This value is only ever used to choose/localise a read-only mirror. It is
 * never treated as proof of identity for writes — see docs/OFFLINE_PLAN.md.
 */

import { offlineDbNameFor } from "@/config/offline";

const STORAGE_KEY = "snobbin-offline:identity";
const SNOB_KEY = "snobbin-offline:snob-id";

/** `undefined` means "not read from storage yet"; `null` means "known absent". */
let cached: string | null | undefined;
const listeners = new Set<() => void>();

export function getRememberedSub(): string | null {
  if (cached !== undefined) return cached;

  if (typeof localStorage === "undefined") {
    cached = null;
    return cached;
  }

  try {
    cached = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can throw in private modes; degrade to "unknown identity".
    cached = null;
  }
  return cached;
}

export function setRememberedSub(sub: string | null): void {
  cached = sub;
  if (typeof localStorage !== "undefined") {
    try {
      if (sub) localStorage.setItem(STORAGE_KEY, sub);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore: in-memory value still applies for this session.
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribeIdentity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The SQLite file name for the currently remembered identity. */
export function getOfflineDbName(): string {
  return offlineDbNameFor(getRememberedSub());
}

/**
 * The *database* id of the signed-in snob (a UUID), as opposed to the Auth0
 * `sub`. Needed by the local read models (e.g. "my groups") and written during
 * bootstrap, when the server tells us which snob the session belongs to.
 */
export function getRememberedSnobId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(SNOB_KEY);
  } catch {
    return null;
  }
}

export function setRememberedSnobId(snobId: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (snobId) localStorage.setItem(SNOB_KEY, snobId);
    else localStorage.removeItem(SNOB_KEY);
  } catch {
    // Ignore: only used to scope reads.
  }
}

/** Test helper: clears the in-memory cache so storage is re-read. */
export function __resetIdentityCache(): void {
  cached = undefined;
}
