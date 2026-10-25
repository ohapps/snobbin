"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaginatedResults, RankingItemSoryBy } from "@/types/rankings";
import type {
  SnobGroup,
  SnobGroupAttributeSummary,
  SnobGroupSearchParams,
} from "@/types/snobGroup";
import { OFFLINE_ENABLED } from "@/config/offline";
import {
  getLocalGroupAttributeSummary,
  getLocalGroupForCurrentUser,
  getLocalItems,
} from "@/data/local/repositories";
import { parseAttributeFilters } from "@/data/local/mappers";
import { useConnectivity } from "@/hooks/useConnectivity";

export interface GroupPageData {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
  attributeSummary: SnobGroupAttributeSummary[];
}

export type GroupDataSource = "server" | "local";

export interface UseGroupPageDataResult {
  data: GroupPageData | null;
  source: GroupDataSource;
  loading: boolean;
  error: string | null;
  /** True when offline data exists for this group but the server is unreachable. */
  offline: boolean;
  reload: () => void;
}

/**
 * Resolves the data for a group page, preferring server-provided data (from the
 * RSC render) and falling back to the local mirror when the server is
 * unreachable. See docs/OFFLINE_PLAN.md §2.5.
 *
 * `serverData` is what the RSC page already fetched; when present and the app is
 * online we use it verbatim. When offline, we read from the mirror.
 */
export function useGroupPageData(
  groupId: string,
  searchParams: SnobGroupSearchParams,
  serverData: GroupPageData | null,
): UseGroupPageDataResult {
  const { online, ready } = useConnectivity();
  const [data, setData] = useState<GroupPageData | null>(serverData);
  const [source, setSource] = useState<GroupDataSource>("server");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    // Keep server data while online (fast path), unless a reload was requested.
    if (online && serverData && reloadToken === 0) {
      setData(serverData);
      setSource("server");
      setError(null);
      return;
    }

    if (!OFFLINE_ENABLED) return;

    let cancelled = false;

    const loadFromLocal = async () => {
      setLoading(true);
      setError(null);
      try {
        const page = parseInt(searchParams.page ?? "1", 10) || 1;
        const group = await getLocalGroupForCurrentUser(groupId);
        if (!group) {
          if (!cancelled) {
            setError("No offline copy of this group is available.");
            setData(null);
          }
          return;
        }

        const [paginatedResults, attributeSummary] = await Promise.all([
          getLocalItems({
            groupId,
            page,
            keyword: searchParams.keyword,
            sortBy: searchParams.sortBy as RankingItemSoryBy | undefined,
            status: searchParams.status,
            attributeFilters: parseAttributeFilters(searchParams),
          }),
          getLocalGroupAttributeSummary(groupId),
        ]);

        if (!cancelled) {
          setData({ group, paginatedResults, attributeSummary });
          setSource("local");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFromLocal();

    return () => {
      cancelled = true;
    };
  }, [online, groupId, searchParams, serverData, reloadToken]);

  return {
    data,
    source,
    loading: loading || !ready,
    error,
    offline: !online && source === "local",
    reload,
  };
}
