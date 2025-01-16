import { getGroupForCurrentUser } from '@/actions/group/get-group-for-current-user';
import { getItems } from '@/actions/items/get-items';
import GroupDetails from '@/components/Group/GroupDetails';
import PageContainer from '@/components/Page/PageContainer';
import ItemDrawer from '@/components/RankingItem/ItemDrawer';

const GroupPage = async ({
  params,
  searchParams,
}: {
  params: { groupId: string };
  searchParams: {
    page: string;
    keyword: string;
    sortBy: string;
    sortDirection: string;
  };
}) => {
  const page = parseInt(searchParams.page, 10) || 1;
  const group = await getGroupForCurrentUser(params.groupId);
  const pageinatedResults = await getItems(
    params.groupId,
    page,
    searchParams.keyword,
    searchParams.sortBy,
    searchParams.sortDirection
  );
  return (
    <PageContainer>
      <GroupDetails group={group} paginatedResults={pageinatedResults} />
      <ItemDrawer group={group} />
    </PageContainer>
  );
};

export default GroupPage;
