import PendingInvites from "@/components/Activity/PendingInvites";
import RecentItems from "@/components/Activity/RecentItems";
import PageContainer from "@/components/Page/PageContainer";
import { getPendingInvites } from "@/server/utils/group/get-pending-invites";
import { getRecentItems } from "@/server/utils/items/get-recent-items";
import Grid from "@mui/material/Grid2";

const Page = async () => {
  const invites = await getPendingInvites();
  const recentItems = await getRecentItems();
  return (
    <PageContainer>
      <Grid container spacing={2} p={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingInvites invites={invites} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RecentItems recentItems={recentItems} />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Page;
