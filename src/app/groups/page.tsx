import PageContainer from "@/components/Page/PageContainer";
import GroupsPageClient from "@/components/Group/GroupsPageClient";
import { getCurrentUserGroups } from "@/server/utils/group/get-current-user-groups";
import { OFFLINE_ENABLED } from "@/config/offline";
import type { SnobGroup } from "@/types/snobGroup";
import { redirectIfNoSession } from "@/server/utils/user/get-current-user";

const Page = async () => {
  let groups: SnobGroup[] | null = null;

  try {
    groups = await getCurrentUserGroups();
  } catch (error) {
    // An expired session means log in again, not the offline fallback.
    redirectIfNoSession(error);
    // Offline: render from the local mirror instead of erroring.
    if (!OFFLINE_ENABLED) throw error;
  }

  return (
    <PageContainer>
      <GroupsPageClient serverGroups={groups} />
    </PageContainer>
  );
};

export default Page;
