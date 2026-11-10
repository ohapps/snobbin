import { getLastGroupId } from "@/server/utils/user/get-last-group-id";
import { OFFLINE_ENABLED } from "@/config/offline";
import OfflineHomeRedirect from "@/components/Offline/OfflineHomeRedirect";
import { redirectIfNoSession } from "@/server/utils/user/get-current-user";

/**
 * Landing route.
 *
 * This deliberately renders a cacheable page and redirects on the client rather
 * than issuing a server-side 307: a redirect response is not cached by the
 * service worker, so a server redirect here would make opening the app offline
 * fail outright. See docs/OFFLINE_PLAN.md › Service worker.
 */
export default async function Home() {
  let lastGroupId: string | null = null;
  let resolved = false;

  try {
    lastGroupId = (await getLastGroupId()) ?? null;
    resolved = true;
  } catch (error) {
    // An expired session means log in again, not the offline fallback.
    redirectIfNoSession(error);
    // Offline: fall back to the mirror's last group.
    if (!OFFLINE_ENABLED) throw error;
  }

  return (
    <OfflineHomeRedirect serverLastGroupId={lastGroupId} resolved={resolved} />
  );
}
