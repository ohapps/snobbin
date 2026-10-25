import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { getUserFromSession } from "@/server/utils/user/get-user-from-session";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import type { Snob } from "@/types/snob";

/**
 * Session-cookie auth for the `/api/offline/*` routes.
 *
 * The web app authenticates with an Auth0 session cookie (not a Bearer token
 * like `/api/mobile/*`), so these routes use `getSession()` directly. Unlike
 * `getCurrentUser`, this returns a typed result instead of throwing, so callers
 * can return proper 401/403 JSON.
 */

export type OfflineAuthResult =
  | { ok: true; snob: Snob }
  | { ok: false; response: NextResponse };

export async function requireSession(): Promise<OfflineAuthResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  const snob = await getUserFromSession(session);
  if (!snob) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return { ok: true, snob };
}

export type OfflineMemberResult =
  | { ok: true; snob: Snob; membership: { id: string; role: string } }
  | { ok: false; response: NextResponse };

export async function requireSessionMember(
  groupId: string,
): Promise<OfflineMemberResult> {
  const auth = await requireSession();
  if (!auth.ok) return auth;

  const membership = await getActiveMembership(groupId, auth.snob.id ?? "");
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, snob: auth.snob, membership };
}
