"use client";

import { useEffect } from "react";
import { refreshBootstrap } from "@/hooks/useAutoSync";

const OfflineBootstrapInitializer = () => {
  useEffect(() => {
    refreshBootstrap().catch(() => {
      // ignore
    });
  }, []);
  return null;
};

export default OfflineBootstrapInitializer;
