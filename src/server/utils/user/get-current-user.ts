import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import { getUserFromSession } from "./get-user-from-session";
import { Snob } from "@/types/snob";

export const NO_SESSION_MESSAGE = "No session found for current user";
export const LOGIN_PATH = "/api/auth/login";

/**
 * Thrown when the request has no Auth0 session: the session expired or the
 * user logged out in another tab. This is expected, not a bug, so it is not
 * reported to Sentry (see `ignoreErrors` in the Sentry configs); pages send
 * the user to log in instead (see `redirectIfNoSession`).
 */
export class NoSessionError extends Error {
  constructor() {
    super(NO_SESSION_MESSAGE);
    this.name = "NoSessionError";
  }
}

export const getCurrentUser = async (): Promise<Snob> => {
  const session = await getSession();

  if (!session) {
    throw new NoSessionError();
  }

  const snob = await getUserFromSession(session);

  if (!snob) {
    throw new Error("No snob found for current session");
  }

  return snob;
};

/**
 * For a page's catch block: sends the user to log in when the error is a
 * missing session, and returns otherwise.
 *
 * Full page loads are already redirected by `LoginCheck` in the root layout,
 * but client-side navigations only re-render the page, so without this an
 * expired session fell through to the offline (read-only) fallback instead of
 * the login screen.
 */
export function redirectIfNoSession(error: unknown): void {
  if (error instanceof NoSessionError) redirect(LOGIN_PATH);
}
