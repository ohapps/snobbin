"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import GroupDetails from "@/components/Group/GroupDetails";
import ItemDrawer from "@/components/RankingItem/ItemDrawer";
import { SnobGroupSearchParams } from "@/types/snobGroup";
import {
  useGroupPageData,
  type GroupPageData,
} from "@/hooks/useGroupPageData";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getLocalGroupForCurrentUserDexie, getLocalItemsDexie, getLocalGroupAttributeSummaryDexie } from "@/data/local/dexie-repositories";

/**
 * Client shell for the group page.
 *
 * Receives the server-rendered data as `serverData` (the online fast path) and
 * transparently falls back to the local SQLite mirror when the server is
 * unreachable. The presentational components are reused unchanged because the
 * local repository returns identical shapes.
 */
const GroupPageClient = ({
  groupId,
  searchParams,
  serverData,
}: {
  groupId: string;
  searchParams: SnobGroupSearchParams;
  serverData: GroupPageData | null;
}) => {
  // Offline query state. When the server is unreachable a router navigation
  // would fail (RSC fetch), so page/sort/filter/search changes are applied to
  // local state and re-read from the mirror instead.
  const [localParams, setLocalParams] = useState<SnobGroupSearchParams | null>(
    null,
  );

  const { data, source, loading, error } = useGroupPageData(
    groupId,
    localParams ?? searchParams,
    serverData,
  );
  const { online } = useConnectivity();

  // Read-only covers both "reading from the mirror" and "the connection dropped
  // while this page still shows server-rendered data". The latter is why this
  // cannot rely on `source` alone: cached RSC data stays on screen when the
  // network goes away, and it must not keep its edit affordances.
  const readOnly = !online || source === "local";

  // Quietly mirror this group for offline reading the first time it is viewed
  // online. Non-blocking and idempotent; no user action required.
  useAutoSync(groupId);

  const onUpdateQuery = useCallback(
    (newParams: Record<string, string>) => {
      setLocalParams((prev) => ({
        ...(prev ?? searchParams),
        ...newParams,
      }));
    },
    [searchParams],
  );

  // Once back online, drop the local overrides so the server path takes over.
  useEffect(() => {
    if (source === "server" && localParams) {
      setLocalParams(null);
    }
  }, [source, localParams]);

  // While reading from the mirror, query changes are handled locally.
  const effectiveSearchParams = useMemo(
    () => localParams ?? searchParams,
    [localParams, searchParams],
  );

  if (!data) {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Box py={4}>
        <Typography color="error">
          {error ?? "Unable to load this group."}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <GroupDetails
        group={data.group}
        paginatedResults={data.paginatedResults}
        attributeSummary={data.attributeSummary}
        searchParams={effectiveSearchParams}
        readOnly={readOnly}
        onUpdateQuery={readOnly ? onUpdateQuery : undefined}
      />
      {/* The item drawer contains the write form, so it is hidden offline for
          the read-only experience. */}
      {!readOnly && (
        <ItemDrawer
          group={data.group}
          snobGroupAttributes={data.attributeSummary}
        />
      )}
    </>
  );
};

export default GroupPageClient;
