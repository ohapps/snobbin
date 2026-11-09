"use client";

import { useCallback } from "react";
import { clearOfflineData } from "@/data/local/clear";
import { setRememberedSub } from "@/data/local/identity";
import { resetDexieDb } from "@/data/local/dexie-db";

/**
 * Logout handler that removes on-device data before leaving.
 *
 * Without this, cached groups (and cached images) would survive logout and be
 * readable by whoever uses the device next. The Auth0 logout endpoint is a
 * redirect, so we block navigation, wipe, then navigate.
 */
export function useOfflineLogout() {
  return useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();

    try {
      await clearOfflineData();
    } finally {
      setRememberedSub(null);
      resetDexieDb();
      window.location.href = "/api/auth/logout";
    }
  }, []);
}
