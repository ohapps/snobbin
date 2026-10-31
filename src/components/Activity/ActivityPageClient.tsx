"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import PendingInvites from "@/components/Activity/PendingInvites";
import RecentItems from "@/components/Activity/RecentItems";
import { OFFLINE_ENABLED } from "@/config/offline";
import {
  getLocalPendingInvites,
  getLocalRecentItems,
} from "@/data/local/repositories";
import type { RecentRankingItem } from "@/types/rankings";
import type { SnobGroupInvite } from "@/types/snobGroup";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getLocalRecentRankingsDexie } from "@/data/local/dexie-repositories";
import { getLocalGroupInvitesDexie } from "@/data/local/dexie-repositories";

interface ActivityData {
  invites: SnobGroupInvite[];
  recentItems: RecentRankingItem[];
}

/**
 * Activity page with an offline fallback. Invites are read-only offline
 * (accept/decline are server actions and cannot run without a connection).
 */
const ActivityPageClient = ({
  serverData,
}: {
  serverData: ActivityData | null;
}) => {
  const { online, ready } = useConnectivity();
  const [data, setData] = useState<ActivityData | null>(serverData);
  const [source, setSource] = useState<"server" | "local">("server");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!OFFLINE_ENABLED) return;

    if (online && serverData) {
      setData(serverData);
      setSource("server");
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [invites, recentItems] = await Promise.all([
          getLocalPendingInvites(),
          getLocalRecentItems(),
        ]);
        if (!cancelled) {
          setData({ invites, recentItems });
          setSource("local");
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [online, serverData]);

  if (!data) {
    if (!ready) {
      return (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Box py={4}>
        <Typography color="error">
          {error ?? "Unable to load activity."}
        </Typography>
      </Box>
    );
  }

  // Offline means read-only even if cached server-rendered data is still shown.
  const readOnly = !online || source === "local";

  return (
    <Grid container spacing={2} p={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <PendingInvites invites={data.invites} readOnly={readOnly} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RecentItems recentItems={data.recentItems} />
      </Grid>
    </Grid>
  );
};

export default ActivityPageClient;
