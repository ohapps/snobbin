import { getItems } from '@/server/utils/items/get-items';
import GroupDetails from '@/components/Group/GroupDetails';
import PageContainer from '@/components/Page/PageContainer';
import ItemDrawer from '@/components/RankingItem/ItemDrawer';
import { getGroupForCurrentUser } from '@/server/utils/group/get-group-for-current-user';
import { updateLastGroup } from '@/server/utils/user/update-last-group';
import { getGroupAttributeSummary } from '@/server/utils/group/get-group-attribute-summary';

const GroupPage = async ({
  params,
  searchParams,
}: {
  params: { groupId: string };
  searchParams: {
    page: string;
    keyword: string;
    sortBy: string;
  };
}) => {
  const page = parseInt(searchParams.page, 10) || 1;
  const group = await getGroupForCurrentUser(params.groupId);
  await updateLastGroup(group);
  const attributeSummary = await getGroupAttributeSummary(group);
  const pageinatedResults = await getItems(
    params.groupId,
    page,
    searchParams.keyword,
    searchParams.sortBy
  );
  return (
    <PageContainer>
      <GroupDetails
        group={group}
        paginatedResults={pageinatedResults}
        attributeSummary={attributeSummary}
      />
      <ItemDrawer group={group} snobGroupAttributes={attributeSummary} />
    </PageContainer>
  );
};

export default GroupPage;
