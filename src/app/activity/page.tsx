import PendingInvites from '@/components/Activity/PendingInvites';
import PageContainer from '@/components/Page/PageContainer';
import { getPendingInvites } from '@/server/utils/group/get-pending-invites';
import Grid from '@mui/material/Grid2';

const Page = async () => {
  const invites = await getPendingInvites();
  return (
    <PageContainer>
      <Grid container spacing={2} p={2}>
        <Grid size={{ xs: 6 }}>
          <PendingInvites invites={invites} />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Page;
