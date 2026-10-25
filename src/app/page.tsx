import { getLastGroupId } from "@/server/utils/user/get-last-group-id";
import { OFFLINE_ENABLED } from "@/config/offline";
import OfflineHomeRedirect from "@/components/Offline/OfflineHomeRedirect";

/**
 * Landing route.
 *
 * This deliberately renders a cacheable page and redirects on the client rather
 * than issuing a server-side 307: a redirect response is not cached by the
 * service worker, so a server redirect here would make opening the app offline
 * fail outright. See docs/OFFLINE_PLAN.md §4 Phase 4.
 */
export default async function Home() {
  let lastGroupId: string | null = null;
  let resolved = false;

  try {
    lastGroupId = (await getLastGroupId()) ?? null;
    resolved = true;
  } catch (error) {
    // Offline: fall back to the mirror's last group.
    if (!OFFLINE_ENABLED) throw error;
  }

  return (
    <OfflineHomeRedirect serverLastGroupId={lastGroupId} resolved={resolved} />
  );
}
