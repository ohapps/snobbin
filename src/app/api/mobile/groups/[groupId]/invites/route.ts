import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { snobGroupInvitesTable } from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import { z } from "zod";

const CreateInviteSchema = z.object({
  email: z.string().email("please enter a valid email address"),
});

/**
 * POST /api/mobile/groups/:groupId/invites
 *
 * Creates a pending invite for the given email.
 * Does not send an email — the invitee must check their activity page.
 * Auth: Bearer token (Auth0 access token).
 * Authorization: user must be an active member of the group.
 */
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 },
    );
  }

  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  // Check for existing pending or accepted invite
  const existing = await db
    .select()
    .from(snobGroupInvitesTable)
    .where(
      and(
        eq(snobGroupInvitesTable.groupId, groupId),
        eq(snobGroupInvitesTable.email, email),
        inArray(snobGroupInvitesTable.status, ["PENDING", "ACCEPTED"]),
      ),
    );

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An invite for this email already exists" },
      { status: 409 },
    );
  }

  const inviteId = generateNewId();

  await db.insert(snobGroupInvitesTable).values({
    id: inviteId,
    groupId,
    email,
    status: "PENDING",
  });

  return NextResponse.json(
    { id: inviteId, email, status: "PENDING" },
    { status: 201 },
  );
}

/**
 * GET /api/mobile/groups/:groupId/invites
 *
 * Returns all pending invites for the group.
 * Auth: Bearer token (Auth0 access token).
 * Authorization: user must be an active member of the group.
 */
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 },
    );
  }

  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 },
    );
  }

  const invites = await db
    .select()
    .from(snobGroupInvitesTable)
    .where(
      and(
        eq(snobGroupInvitesTable.groupId, groupId),
        eq(snobGroupInvitesTable.status, "PENDING"),
      ),
    );

  return NextResponse.json({
    invites: invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      status: inv.status,
    })),
  });
}
