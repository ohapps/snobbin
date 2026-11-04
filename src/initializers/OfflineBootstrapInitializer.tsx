"use client";

import { useEffect } from "react";
import { refreshBootstrap } from "@/hooks/useAutoSync";
import { syncBootstrapDexie } from "@/data/local/dexie-sync";

const OfflineBootstrapInitializer = () => {
  useEffect(() => {
    const run = async () => {
      try {
        console.warn("[OfflineBootstrapInitializer] forcing bootstrap");
        await syncBootstrapDexie();
        await refreshBootstrap();
      } catch (e) {
        console.warn("[OfflineBootstrapInitializer] err", e);
      }
    };
    run();
    // also run again after a delay
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, []);
  return null;
};

export default OfflineBootstrapInitializer;
