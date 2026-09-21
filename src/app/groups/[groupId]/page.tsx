import { getItems } from "@/server/utils/items/get-items";
import GroupDetails from "@/components/Group/GroupDetails";
import PageContainer from "@/components/Page/PageContainer";
import ItemDrawer from "@/components/RankingItem/ItemDrawer";
import { getGroupForCurrentUser } from "@/server/utils/group/get-group-for-current-user";
import { updateLastGroup } from "@/server/utils/user/update-last-group";
import { getGroupAttributeSummary } from "@/server/utils/group/get-group-attribute-summary";
import { SnobGroupSearchParams } from "@/types/snobGroup";

const GroupPage = async ({
  params,
  searchParams,
}: {
  params: { groupId: string };
  searchParams: SnobGroupSearchParams;
}) => {
  const page = parseInt(searchParams.page ?? "1", 10) || 1;
  const group = await getGroupForCurrentUser(params.groupId);
  await updateLastGroup(group);
  const attributeSummary = await getGroupAttributeSummary(group);

  const attributeFilters: Record<string, string> = {};
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key.startsWith("attr_") && typeof value === "string" && value) {
      const attributeId = key.replace("attr_", "");
      attributeFilters[attributeId] = value;
    }
  });

  const pageinatedResults = await getItems(
    params.groupId,
    page,
    searchParams.keyword,
    searchParams.sortBy,
    searchParams.status,
    attributeFilters,
  );
  return (
    <PageContainer>
      <GroupDetails
        group={group}
        paginatedResults={pageinatedResults}
        attributeSummary={attributeSummary}
        searchParams={searchParams}
      />
      <ItemDrawer group={group} snobGroupAttributes={attributeSummary} />
    </PageContainer>
  );
};

export default GroupPage;
