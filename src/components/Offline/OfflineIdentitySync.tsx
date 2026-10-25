"use client";

import { useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { offlineDbNameFor } from "@/config/offline";
import { clearOfflineDataFor } from "@/data/local/clear";
import {
  getRememberedSub,
  setRememberedSub,
} from "@/data/local/identity";
import { sqliteClient } from "@/data/local/sqlite-client";

/**
 * Keeps the on-device mirror namespaced to the signed-in user.
 *
 * The database file name is derived from the remembered Auth0 `sub`, so a second
 * account on the same device opens a *different* (initially empty) mirror and
 * cannot read the first account's cached groups. When the identity actually
 * changes, the previous user's rows are wiped before the new identity is
 * adopted.
 *
 * Offline, `useUser()` cannot resolve (it needs `/api/auth/me`), so no change is
 * made and the remembered identity continues to be used — which is required for
 * offline reading to work at all.
 */
const OfflineIdentitySync = () => {
  const { user } = useUser();
  const sub = user?.sub ?? null;

  useEffect(() => {
    if (!sub) return;

    const previous = getRememberedSub();
    if (previous === sub) return;

    let cancelled = false;

    const adopt = async () => {
      // Wipe the other user's mirror before switching to this identity.
      if (previous) {
        await clearOfflineDataFor(offlineDbNameFor(previous));
      }
      if (cancelled) return;
      setRememberedSub(sub);
      // Force the next query to open the new identity's database.
      sqliteClient.reset();
    };

    void adopt();

    return () => {
      cancelled = true;
    };
  }, [sub]);

  return null;
};

export default OfflineIdentitySync;
