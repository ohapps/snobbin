import { getCurrentUserGroups } from '@/actions/group/get-current-user-groups';
import GroupList from '@/components/Group/GroupList';
import GroupToolbar from '@/components/Group/GroupToolbar';
import PageContainer from '@/components/Page/PageContainer';

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
