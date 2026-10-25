import { checkForNewUser } from "@/server/utils/user/check-for-new-user";
import { getSession } from "@auth0/nextjs-auth0";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { redirect } from "next/navigation";
import { OFFLINE_ENABLED } from "@/config/offline";

const LoginCheck = async ({ children }: { children: React.ReactNode }) => {
  let session = null;

  try {
    session = await getSession();
  } catch (error) {
    // Offline support: the session check itself failed (cache backend or API
    // unreachable) rather than reporting "no session". We must not force a
    // re-login in that case — let the shell render and let the client resolve
    // the user from the cached local mirror. See docs/OFFLINE_PLAN.md §2.5.
    if (OFFLINE_ENABLED) return <>{children}</>;
    throw error;
  }

  if (!session) {
    redirect("/api/auth/login");
  } else {
    try {
      await checkForNewUser(session);
    } catch (error) {
      // Same reasoning: a write to a flaky backend must not bounce an
      // already-authenticated user to the login screen.
      if (!OFFLINE_ENABLED) throw error;
    }
  }

  return <>{children}</>;
};

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      <LoginCheck>{children}</LoginCheck>
    </UserProvider>
  );
};

export default AuthInitializer;
