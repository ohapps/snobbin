import { NextResponse } from "next/server";
import { eq, and, ne, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobsTable,
  snobGroupAttributesTable,
  rankingItemsTable,
  rankingItemAttributesTable,
  rankingsTable,
} from "@/server/db/schema";

/**
 * GET /api/mobile/groups/:groupId
 *
 * Returns complete group data: group info, members, snob profiles,
 * attributes, items, item attributes, and rankings.
 *
 * Auth: Bearer token (Auth0 access token).
 * Authorization: user must be an active member of the group.
 */
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;

  // Validate auth — extract user from token
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 },
    );
  }

  // Verify user is a member of this group
  const membershipCheck = await db
    .select({ id: snobGroupMembersTable.id })
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.groupId, groupId),
        eq(snobGroupMembersTable.snobId, userId),
        ne(snobGroupMembersTable.role, "DISABLED"),
      ),
    )
    .limit(1);

  if (membershipCheck.length === 0) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 },
    );
  }

  // Update lastGroupId for the user (fire-and-forget, don't block the response)
  db.update(snobsTable)
    .set({ lastGroupId: groupId })
    .where(eq(snobsTable.id, userId))
    .catch(() => {});

  // Fetch group
  const groupRows = await db
    .select()
    .from(snobGroupsTable)
    .where(eq(snobGroupsTable.id, groupId));

  if (groupRows.length === 0) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Fetch all related data in parallel
  const [members, attributes, items] = await Promise.all([
    db
      .select()
      .from(snobGroupMembersTable)
      .where(eq(snobGroupMembersTable.groupId, groupId)),

    db
      .select()
      .from(snobGroupAttributesTable)
      .where(eq(snobGroupAttributesTable.groupId, groupId)),

    db
      .select()
      .from(rankingItemsTable)
      .where(eq(rankingItemsTable.groupId, groupId)),
  ]);

  // Get item IDs for fetching attributes and rankings
  const itemIds = items.map((i) => i.id);

  const [itemAttributes, rankings] = await Promise.all([
    itemIds.length > 0
      ? db
          .select()
          .from(rankingItemAttributesTable)
          .where(inArray(rankingItemAttributesTable.itemId, itemIds))
      : Promise.resolve([]),
    itemIds.length > 0
      ? db
          .select()
          .from(rankingsTable)
          .where(inArray(rankingsTable.itemId, itemIds))
      : Promise.resolve([]),
  ]);

  // Get snob profiles for all members
  const memberSnobIds = Array.from(new Set(members.map((m) => m.snobId)));
  const snobs =
    memberSnobIds.length > 0
      ? await db
          .select()
          .from(snobsTable)
          .where(inArray(snobsTable.id, memberSnobIds))
      : [];

  const g = groupRows[0];

  return NextResponse.json({
    group: {
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
    },
    members: members.map((m) => ({
      id: m.id,
      group_id: m.groupId,
      snob_id: m.snobId,
      role: m.role,
    })),
    snobs: snobs.map((s) => ({
      id: s.id,
      email: s.email,
      first_name: s.firstName,
      last_name: s.lastName,
      picture_url: s.pictureUrl,
      last_group_id: s.lastGroupId,
    })),
    attributes: attributes.map((a) => ({
      id: a.id,
      group_id: a.groupId,
      name: a.name,
    })),
    items: items.map((item) => ({
      id: item.id,
      group_id: item.groupId,
      description: item.description,
      ranked: item.ranked ? 1 : 0,
      average_ranking: item.averageRanking ? Number(item.averageRanking) : null,
      image_id: item.imageId,
      image_url: item.imageUrl,
      created_date: item.createdDate?.toISOString() ?? null,
      updated_date: item.updatedDate?.toISOString() ?? null,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
    })),
    itemAttributes: itemAttributes.map((ia) => ({
      id: ia.id,
      item_id: ia.itemId,
      attribute_id: ia.attributeId,
      attribute_value: ia.attributeValue,
    })),
    rankings: rankings.map((r) => ({
      id: r.id,
      item_id: r.itemId,
      group_member_id: r.groupMemberId,
      ranking: Number(r.ranking),
      notes: r.notes,
      created_date: r.createdDate?.toISOString() ?? null,
      updated_date: r.updatedDate?.toISOString() ?? null,
    })),
  });
}

const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;

async function getUserIdFromToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  if (!AUTH0_ISSUER_BASE_URL) {
    // Dev mode: decode the JWT payload without verification
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString(),
      );
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  const userInfo = await fetch(`${AUTH0_ISSUER_BASE_URL}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!userInfo.ok) return null;

  const info = await userInfo.json();
  return info.sub || null;
}
