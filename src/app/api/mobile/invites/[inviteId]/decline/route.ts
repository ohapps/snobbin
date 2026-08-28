import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { snobGroupInvitesTable, snobsTable } from "@/server/db/schema";
import { requireAuth } from "@/server/utils/api/route-guards";

/**
 * POST /api/mobile/invites/:inviteId/decline
 *
 * Declines a pending invite — marks it as REJECTED.
 * Auth: Bearer token (Auth0 access token).
 * Authorization: invite must belong to the authenticated user's email.
 */
export async function POST(
  request: Request,
  { params }: { params: { inviteId: string } },
) {
  const { inviteId } = params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Get the user's email
  const snobs = await db
    .select({ email: snobsTable.email })
    .from(snobsTable)
    .where(eq(snobsTable.id, auth.userId))
    .limit(1);

  if (snobs.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userEmail = snobs[0].email;

  // Find the invite — must be PENDING and belong to this user's email
  const invites = await db
    .select()
    .from(snobGroupInvitesTable)
    .where(
      and(
        eq(snobGroupInvitesTable.id, inviteId),
        eq(snobGroupInvitesTable.email, userEmail),
        eq(snobGroupInvitesTable.status, "PENDING"),
      ),
    )
    .limit(1);

  if (invites.length === 0) {
    return NextResponse.json(
      { error: "Invite not found or already processed" },
      { status: 404 },
    );
  }

  // Mark invite as rejected
  await db
    .update(snobGroupInvitesTable)
    .set({ status: "REJECTED" })
    .where(eq(snobGroupInvitesTable.id, inviteId));

  return new NextResponse(null, { status: 204 });
}
