"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import GroupList from "@/components/Group/GroupList";
import GroupToolbar from "@/components/Group/GroupToolbar";
import { OFFLINE_ENABLED } from "@/config/offline";
import { getLocalGroups } from "@/data/local/repositories";
import { getLocalGroupsDexie } from "@/data/local/dexie-repositories";
import type { SnobGroup } from "@/types/snobGroup";
import { useConnectivity } from "@/hooks/useConnectivity";

/**
 * Groups list with an offline fallback.
 *
 * `serverGroups` is the RSC result; when the server is unreachable the page
 * passes `null` and we read the list from the local mirror instead. Write
 * affordances (New Group) are hidden in that case.
 */
const GroupsPageClient = ({
  serverGroups,
}: {
  serverGroups: SnobGroup[] | null;
}) => {
  const { online, ready } = useConnectivity();
  const [groups, setGroups] = useState<SnobGroup[] | null>(serverGroups);
  const [source, setSource] = useState<"server" | "local">("server");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!OFFLINE_ENABLED) return;

    // Server data is authoritative while online.
    if (online && serverGroups) {
      setGroups(serverGroups);
      setSource("server");
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        try {
          const local = await getLocalGroupsDexie();
          if (!cancelled) {
            setGroups(local);
            setSource("local");
            setError(null);
            return;
          }
        } catch {
          // Try SQLite fallback
        }
        const local = await getLocalGroups();
        if (!cancelled) {
          setGroups(local);
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
  }, [online, serverGroups]);

  if (!groups) {
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
          {error ?? "Unable to load your groups."}
        </Typography>
      </Box>
    );
  }

  // Offline means read-only even if cached server-rendered data is still shown.
  const readOnly = !online || source === "local";

  return (
    <>
      <GroupToolbar readOnly={readOnly} />
      <GroupList groups={groups} readOnly={readOnly} />
    </>
  );
};

export default GroupsPageClient;
