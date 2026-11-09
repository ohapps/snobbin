"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { getLocalLastGroupId } from "@/data/local/repositories";

/**
 * Client-side landing redirect.
 *
 * Online, `serverLastGroupId` is authoritative (`resolved` says the server
 * actually answered). Offline — or when the server render failed — the same
 * destination is resolved from the local mirror.
 */
const OfflineHomeRedirect = ({
  serverLastGroupId,
  resolved,
}: {
  serverLastGroupId: string | null;
  /** True when the server successfully answered (even if the value was null). */
  resolved: boolean;
}) => {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const redirect = async () => {
      if (resolved) {
        router.replace(
          serverLastGroupId ? `/groups/${serverLastGroupId}` : "/activity",
        );
        return;
      }

      // Offline fallback: mirror first, then the groups list.
      let target = "/groups";
      try {
        const lastGroupId = await getLocalLastGroupId();
        if (lastGroupId) target = `/groups/${lastGroupId}`;
      } catch {
        // No mirror: the groups list is the safest destination.
      }
      if (!cancelled) router.replace(target);
    };

    void redirect();
    return () => {
      cancelled = true;
    };
  }, [router, resolved, serverLastGroupId]);

  return (
    <Box display="flex" justifyContent="center" py={6}>
      <CircularProgress />
    </Box>
  );
};

export default OfflineHomeRedirect;
