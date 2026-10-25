"use client";

import { useSyncExternalStore } from "react";
import { getRememberedSub, subscribeIdentity } from "@/data/local/identity";

/**
 * The Auth0 `sub` the on-device mirror belongs to, or `null` when unknown.
 * Re-renders when the identity is adopted after login.
 */
export function useOfflineIdentity(): string | null {
  return useSyncExternalStore(
    subscribeIdentity,
    getRememberedSub,
    () => null,
  );
}
