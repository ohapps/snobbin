"use client";

import { useEffect } from "react";
import { refreshBootstrap } from "@/hooks/useAutoSync";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useOfflineIdentity } from "@/hooks/useOfflineIdentity";

/**
 * Fills identity + groups into the mirror as soon as the signed-in user is
 * known and we're online. Waits for `sub` so the data lands in that user's
 * database rather than the anonymous one.
 */
const OfflineBootstrapInitializer = () => {
  const sub = useOfflineIdentity();
  const { online, ready } = useConnectivity();

  useEffect(() => {
    if (!sub || !ready || !online) return;
    refreshBootstrap().catch((e) => {
      console.warn("[OfflineBootstrapInitializer] err", e);
    });
  }, [sub, online, ready]);

  return null;
};

export default OfflineBootstrapInitializer;
