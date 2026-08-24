import { getSession } from "@auth0/nextjs-auth0";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { snobsTable } from "@/server/db/schema";
import { Snob } from "@/types/snob";
import { getUserIdFromToken } from "./get-user-id-from-token";
import { getUserFromSession } from "./get-user-from-session";

/**
 * Authenticates a user from either a Bearer token (mobile) or web session.
 * Tries the Bearer token first, then falls back to the Auth0 session.
 *
 * Returns the authenticated Snob or null if neither method succeeds.
 */
export async function getAuthenticatedUser(
  request: Request,
): Promise<Snob | null> {
  // Try Bearer token first (mobile clients)
  const tokenUserId = await getUserIdFromToken(request);
  if (tokenUserId) {
    const snobs = await db
      .select()
      .from(snobsTable)
      .where(eq(snobsTable.id, tokenUserId));
    if (snobs.length > 0) {
      const s = snobs[0];
      return {
        id: s.id,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        pictureUrl: s.pictureUrl,
        lastGroupId: s.lastGroupId,
        isPremium: s.isPremium,
      };
    }
  }

  // Fall back to web session
  const session = await getSession();
  if (session) {
    return getUserFromSession(session);
  }

  return null;
}
