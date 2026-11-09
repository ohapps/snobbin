import { getCurrentUser } from "@/server/utils/user/get-current-user";
import ProfilePageClient from "@/components/Profile/ProfilePageClient";
import OfflineDataSettings from "@/components/Profile/OfflineDataSettings";
import { OFFLINE_ENABLED } from "@/config/offline";
import type { Snob } from "@/types/snob";

const Page = async () => {
  let snob: Snob | null = null;

  try {
    snob = await getCurrentUser();
  } catch (error) {
    // Offline: render the cached profile read-only instead of erroring.
    if (!OFFLINE_ENABLED) throw error;
  }

  return (
    <>
      <ProfilePageClient serverSnob={snob} />
      <OfflineDataSettings />
    </>
  );
};

export default Page;
