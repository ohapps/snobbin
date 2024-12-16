import { getGroupForCurrentUser } from '@/actions/group/get-group-for-current-user';
import GroupDetails from '@/components/Group/GroupDetails';
import PageContainer from '@/components/Page/PageContainer';

const GroupPage = async ({ params }: { params: { groupId: string } }) => {
  const group = await getGroupForCurrentUser(params.groupId);
  return (
    <PageContainer>
      <GroupDetails group={group} />
    </PageContainer>
  );
};

export default GroupPage;
