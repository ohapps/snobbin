"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, CircularProgress, Typography } from "@mui/material";
import GroupDetails from "@/components/Group/GroupDetails";
import ItemDrawer from "@/components/RankingItem/ItemDrawer";
import { SnobGroupSearchParams } from "@/types/snobGroup";
import { useGroupPageData, type GroupPageData } from "@/hooks/useGroupPageData";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getRememberedSub } from "@/data/local/identity";
import {
  activeFilters,
  hasFilterParams,
  loadRememberedFilters,
  saveRememberedFilters,
} from "@/utils/remembered-filters";

/**
 * Client shell for the group page.
 *
 * Receives the server-rendered data as `serverData` (the online fast path) and
 * transparently falls back to the local IndexedDB mirror when the server is
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
  const { online, ready } = useConnectivity();
  const router = useRouter();
  const pathname = usePathname();

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

  // True while navigating to the remembered filter, to avoid flashing the
  // unfiltered list.
  const [restoring, setRestoring] = useState(false);

  // Once back online, drop the local overrides so the server path takes over.
  // (A remembered filter that was applied locally is re-applied below.)
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

  const group = data?.group.id === groupId ? data.group : null;

  // Re-apply the group's last filter whenever it is shown with no filter in
  // the URL. A URL that states a filter (including RESET's explicit "all")
  // wins. See src/utils/remembered-filters.ts.
  useEffect(() => {
    if (!ready || !group || restoring) return;
    if (hasFilterParams(effectiveSearchParams)) return;

    const saved = activeFilters(
      loadRememberedFilters(getRememberedSub(), groupId),
      group.attributes.map((attribute) => attribute.id),
    );
    if (Object.keys(saved).length === 0) return;

    const next: SnobGroupSearchParams = {
      ...effectiveSearchParams,
      ...saved,
      page: "1",
    };
    if (readOnly) {
      // Router navigations fail offline; apply it to local state instead.
      setLocalParams(next);
      return;
    }
    const query = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, value);
    });
    setRestoring(true);
    router.replace(`${pathname}?${query.toString()}`);
  }, [
    ready,
    group,
    groupId,
    effectiveSearchParams,
    readOnly,
    restoring,
    router,
    pathname,
  ]);

  // Stop showing the spinner once the filtered page arrives, or if the
  // connection drops mid-navigation (the offline path above takes over).
  useEffect(() => {
    if (restoring && (hasFilterParams(searchParams) || readOnly)) {
      setRestoring(false);
    }
  }, [restoring, searchParams, readOnly]);

  // Remember the filter whenever one is applied; RESET (all "all") forgets it.
  useEffect(() => {
    if (!group || !hasFilterParams(effectiveSearchParams)) return;
    saveRememberedFilters(
      getRememberedSub(),
      groupId,
      activeFilters(
        effectiveSearchParams,
        group.attributes.map((attribute) => attribute.id),
      ),
    );
  }, [group, groupId, effectiveSearchParams]);

  if (!data || restoring) {
    if (loading || restoring) {
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
