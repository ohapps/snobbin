import PageContainer from "@/components/Page/PageContainer";
import ActivityPageClient from "@/components/Activity/ActivityPageClient";
import { getPendingInvites } from "@/server/utils/group/get-pending-invites";
import { getRecentItems } from "@/server/utils/items/get-recent-items";
import { OFFLINE_ENABLED } from "@/config/offline";
import type { RecentRankingItem } from "@/types/rankings";
import type { SnobGroupInvite } from "@/types/snobGroup";
import { redirectIfNoSession } from "@/server/utils/user/get-current-user";

const Page = async () => {
  let serverData: {
    invites: SnobGroupInvite[];
    recentItems: RecentRankingItem[];
  } | null = null;

  try {
    const [invites, recentItems] = await Promise.all([
      getPendingInvites(),
      getRecentItems(),
    ]);
    serverData = { invites, recentItems };
  } catch (error) {
    // An expired session means log in again, not the offline fallback.
    redirectIfNoSession(error);
    // Offline: render from the local mirror instead of erroring.
    if (!OFFLINE_ENABLED) throw error;
  }

  return (
    <PageContainer>
      <ActivityPageClient serverData={serverData} />
    </PageContainer>
  );
};

export default Page;
