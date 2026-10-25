import { getItems } from "@/server/utils/items/get-items";
import { getGroupForCurrentUser } from "@/server/utils/group/get-group-for-current-user";
import { updateLastGroup } from "@/server/utils/user/update-last-group";
import { getGroupAttributeSummary } from "@/server/utils/group/get-group-attribute-summary";
import { SnobGroupSearchParams } from "@/types/snobGroup";
import GroupPageClient from "@/components/Group/GroupPageClient";
import { OFFLINE_ENABLED } from "@/config/offline";
import type { GroupPageData } from "@/hooks/useGroupPageData";

/**
 * Group page. Fetches server data for the online fast path and hands it to the
 * client shell, which falls back to the local SQLite mirror when the server is
 * unreachable (see docs/OFFLINE_PLAN.md §2.5).
 *
 * When offline features are enabled, a server-side failure (DB down, session
 * check failing) must not throw — we pass `null` and let the client render from
 * the mirror.
 */
const fetchServerData = async (
  groupId: string,
  searchParams: SnobGroupSearchParams,
): Promise<GroupPageData | null> => {
  const page = parseInt(searchParams.page ?? "1", 10) || 1;
  const group = await getGroupForCurrentUser(groupId);
  await updateLastGroup(group);
  const attributeSummary = await getGroupAttributeSummary(group);

  const attributeFilters: Record<string, string> = {};
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key.startsWith("attr_") && typeof value === "string" && value) {
      const attributeId = key.replace("attr_", "");
      attributeFilters[attributeId] = value;
    }
  });

  const paginatedResults = await getItems(
    groupId,
    page,
    searchParams.keyword,
    searchParams.sortBy,
    searchParams.status,
    attributeFilters,
  );

  return { group, paginatedResults, attributeSummary };
};

const GroupPage = async ({
  params,
  searchParams,
}: {
  params: { groupId: string };
  searchParams: SnobGroupSearchParams;
}) => {
  let serverData: GroupPageData | null = null;

  try {
    serverData = await fetchServerData(params.groupId, searchParams);
  } catch (error) {
    // Offline features tolerate an unreachable server/DB; without the flag we
    // preserve the original behaviour (a thrown error surfaces as before).
    if (!OFFLINE_ENABLED) throw error;
  }

  return (
    <GroupPageClient
      groupId={params.groupId}
      searchParams={searchParams}
      serverData={serverData}
    />
  );
};

export default GroupPage;
