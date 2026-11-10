"use client";

import { useCallback } from "react";
import { clearOfflineData } from "@/data/local/clear";
import { setRememberedSub } from "@/data/local/identity";
import { resetDexieDb } from "@/data/local/dexie-db";
import { clearRememberedFilters } from "@/utils/remembered-filters";

/**
 * Logout handler that removes on-device data before leaving.
 *
 * Without this, cached groups (and cached images) would survive logout and be
 * readable by whoever uses the device next. The Auth0 logout endpoint is a
 * redirect, so we block navigation, wipe, then navigate. Remembered group
 * filters are forgotten too, since attribute values can be personal.
 */
export function useOfflineLogout() {
  return useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();

    try {
      await clearOfflineData();
    } finally {
      clearRememberedFilters();
      setRememberedSub(null);
      resetDexieDb();
      window.location.href = "/api/auth/logout";
    }
  }, []);
}
