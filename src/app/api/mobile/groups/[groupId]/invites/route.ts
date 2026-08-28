import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { snobGroupInvitesTable } from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { requireMember, parseBody } from "@/server/utils/api/route-guards";
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

  const auth = await requireMember(request, groupId);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, CreateInviteSchema);
  if (!body.ok) return body.response;

  const email = body.data.email.toLowerCase();

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

  const auth = await requireMember(request, groupId);
  if (!auth.ok) return auth.response;

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
