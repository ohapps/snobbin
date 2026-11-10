import HeaderBar from "./HeaderBar";
import {
  getCurrentUser,
  redirectIfNoSession,
} from "@/server/utils/user/get-current-user";
import type { Snob } from "@/types/snob";

export const TopHeader = async () => {
  let snob: Snob;
  try {
    snob = await getCurrentUser();
  } catch (error) {
    // Normally unreachable (LoginCheck redirects first), but never let an
    // expired session crash the layout.
    redirectIfNoSession(error);
    throw error;
  }
  return (
    <>
      <HeaderBar snob={snob} />
    </>
  );
};

export default TopHeader;
