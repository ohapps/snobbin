"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { OFFLINE_ENABLED } from "@/config/offline";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useOfflineIdentity } from "@/hooks/useOfflineIdentity";
import { refreshBootstrap } from "@/hooks/useAutoSync";

/** Ignore rapid offline/online flapping (e.g. a flaky connection). */
const RECONCILE_COOLDOWN_MS = 10_000;

/**
 * Reconciles with the server when connectivity returns.
 *
 * While offline the app is read-only and reads from the SQLite mirror (or from
 * cached RSC data). Without this, coming back online left the page showing that
 * stale snapshot until the user navigated: group lists/memberships were stale for
 * the whole tab session and the open group never re-fetched.
 *
 * On reconnect we:
 *  1. re-run bootstrap so groups, memberships, and invites are current for
 *     future offline reads, and
 *  2. `router.refresh()` so the current route re-renders from the server and the
 *     mirror data on screen is replaced by fresh server data.
 *
 * The realtime `EventSource` and background mirroring already restart on their
 * own because they key off the same connectivity flag.
 */
const OfflineReconnect = () => {
  const { online, ready } = useConnectivity();
  const sub = useOfflineIdentity();
  const router = useRouter();
  const wasOnline = useRef(true);
  const lastReconcileAt = useRef(0);

  useEffect(() => {
    if (!OFFLINE_ENABLED || !ready) return;

    const reconnected = online && !wasOnline.current;
    wasOnline.current = online;
    if (!reconnected) return;

    const now = Date.now();
    if (now - lastReconcileAt.current < RECONCILE_COOLDOWN_MS) return;
    lastReconcileAt.current = now;

    // Only mirror into the per-user database once the identity is known.
    if (sub) {
      refreshBootstrap().catch(() => {
        // Non-fatal: reading stays available and it retries on the next
        // navigation/reconnect.
      });
    }

    router.refresh();
  }, [online, ready, sub, router]);

  return null;
};

export default OfflineReconnect;
