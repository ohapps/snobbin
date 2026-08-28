import { NextResponse } from "next/server";
import { eq, and, ne, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobsTable,
} from "@/server/db/schema";
import { requireAuth } from "@/server/utils/api/route-guards";
import {
  formatGroupResponse,
  formatMemberResponse,
  formatSnobResponse,
} from "@/server/utils/mobile/mobile-formatters";

/**
 * GET /api/mobile/user/:userId/groups
 *
 * Returns all groups the user belongs to, along with their memberships
 * and snob profiles for all members in those groups.
 *
 * Auth: Bearer token (Auth0 access token) validated against userinfo endpoint.
 */
export async function GET(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const { userId } = params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.userId !== userId) {
    return NextResponse.json(
      { error: "Token does not match requested user" },
      { status: 403 },
    );
  }

  // Get user's active memberships
  const userMemberships = await db
    .select()
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.snobId, userId),
        ne(snobGroupMembersTable.role, "DISABLED"),
      ),
    );

  if (userMemberships.length === 0) {
    return NextResponse.json({ groups: [], memberships: [], snobs: [] });
  }

  const groupIds = userMemberships.map((m) => m.groupId);

  // Get groups
  const allGroups = await db
    .select()
    .from(snobGroupsTable)
    .where(inArray(snobGroupsTable.id, groupIds));

  // Get all memberships in those groups (for showing other members)
  const allMemberships = await db
    .select()
    .from(snobGroupMembersTable)
    .where(inArray(snobGroupMembersTable.groupId, groupIds));

  // Get snob profiles for all members
  const memberSnobIds = Array.from(
    new Set(allMemberships.map((m) => m.snobId)),
  );
  const allSnobs =
    memberSnobIds.length > 0
      ? await db
          .select()
          .from(snobsTable)
          .where(inArray(snobsTable.id, memberSnobIds))
      : [];

  return NextResponse.json({
    groups: allGroups.map(formatGroupResponse),
    memberships: allMemberships.map(formatMemberResponse),
    snobs: allSnobs.map(formatSnobResponse),
  });
}
