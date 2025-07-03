import GroupList from '@/components/Group/GroupList';
import GroupToolbar from '@/components/Group/GroupToolbar';
import PageContainer from '@/components/Page/PageContainer';
import { getCurrentUserGroups } from '@/server/utils/group/get-current-user-groups';

const Page = async () => {
  const groups = await getCurrentUserGroups();
  return (
    <PageContainer>
      <GroupToolbar />
      <GroupList groups={groups} />
    </PageContainer>
  );
};

export default Page;
