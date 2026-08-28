import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupInvitesTable,
  snobGroupsTable,
  snobsTable,
} from "@/server/db/schema";
import { requireAuth } from "@/server/utils/api/route-guards";

/**
 * GET /api/mobile/invites
 *
 * Returns all pending invites for the authenticated user (matched by email).
 * Auth: Bearer token (Auth0 access token).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Look up the user's email
  const snobs = await db
    .select({ email: snobsTable.email })
    .from(snobsTable)
    .where(eq(snobsTable.id, auth.userId))
    .limit(1);

  if (snobs.length === 0) {
    return NextResponse.json({ invites: [] });
  }

  const userEmail = snobs[0].email;

  // Fetch pending invites for this email, joined with group name
  const invites = await db
    .select({
      id: snobGroupInvitesTable.id,
      email: snobGroupInvitesTable.email,
      status: snobGroupInvitesTable.status,
      groupId: snobGroupInvitesTable.groupId,
      groupName: snobGroupsTable.name,
      groupDescription: snobGroupsTable.description,
      groupPictureUrl: snobGroupsTable.pictureUrl,
    })
    .from(snobGroupInvitesTable)
    .innerJoin(
      snobGroupsTable,
      eq(snobGroupInvitesTable.groupId, snobGroupsTable.id),
    )
    .where(
      and(
        eq(snobGroupInvitesTable.email, userEmail),
        eq(snobGroupInvitesTable.status, "PENDING"),
      ),
    );

  return NextResponse.json({
    invites: invites.map((inv) => ({
      id: inv.id,
      groupId: inv.groupId,
      groupName: inv.groupName,
      groupDescription: inv.groupDescription,
      groupPictureUrl: inv.groupPictureUrl,
    })),
  });
}
