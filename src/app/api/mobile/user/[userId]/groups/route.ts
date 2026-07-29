import { NextResponse } from "next/server";
import { eq, and, ne, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobsTable,
} from "@/server/db/schema";

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
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  // Validate auth
  const authError = await validateAuth(request, userId);
  if (authError) return authError;

  // Get user's active memberships
  const userMemberships = await db
    .select()
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.snobId, userId),
        ne(snobGroupMembersTable.role, "DISABLED")
      )
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
  const memberSnobIds = Array.from(new Set(allMemberships.map((m) => m.snobId)));
  const allSnobs =
    memberSnobIds.length > 0
      ? await db
          .select()
          .from(snobsTable)
          .where(inArray(snobsTable.id, memberSnobIds))
      : [];

  return NextResponse.json({
    groups: allGroups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      min_ranking: Number(g.minRanking),
      max_ranking: Number(g.maxRanking),
      increments: Number(g.increments),
      rank_icon: g.rankIcon,
      rankings_required: Number(g.rankingsRequired),
      deleted: g.deleted ? 1 : 0,
      picture_url: g.pictureUrl,
    })),
    memberships: allMemberships.map((m) => ({
      id: m.id,
      group_id: m.groupId,
      snob_id: m.snobId,
      role: m.role,
    })),
    snobs: allSnobs.map((s) => ({
      id: s.id,
      email: s.email,
      first_name: s.firstName,
      last_name: s.lastName,
      picture_url: s.pictureUrl,
      last_group_id: s.lastGroupId,
    })),
  });
}

const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;

async function validateAuth(
  request: Request,
  expectedUserId: string
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  if (!AUTH0_ISSUER_BASE_URL) {
    // In development without Auth0 configured, skip validation
    return null;
  }

  const userInfo = await fetch(`${AUTH0_ISSUER_BASE_URL}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!userInfo.ok) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const info = await userInfo.json();
  if (info.sub !== expectedUserId) {
    return NextResponse.json(
      { error: "Token does not match requested user" },
      { status: 403 }
    );
  }

  return null;
}
