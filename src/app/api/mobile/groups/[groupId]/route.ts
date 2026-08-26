import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
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
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import {
  formatGroupResponse,
  formatMemberResponse,
  formatSnobResponse,
  formatAttributeResponse,
  formatItemResponse,
  formatItemAttributeResponse,
  formatRankingResponse,
} from "@/server/utils/mobile/mobile-formatters";

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
  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 },
    );
  }

  // Persist lastGroupId for the user with structured error logging
  try {
    await db
      .update(snobsTable)
      .set({ lastGroupId: groupId })
      .where(eq(snobsTable.id, userId));
  } catch (err) {
    console.error(
      `Failed to update lastGroupId for userId=${userId}, groupId=${groupId}:`,
      err,
    );
  }

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

  return NextResponse.json({
    group: formatGroupResponse(groupRows[0]),
    members: members.map(formatMemberResponse),
    snobs: snobs.map(formatSnobResponse),
    attributes: attributes.map(formatAttributeResponse),
    items: items.map(formatItemResponse),
    itemAttributes: itemAttributes.map(formatItemAttributeResponse),
    rankings: rankings.map(formatRankingResponse),
  });
}

/**
 * DELETE /api/mobile/groups/:groupId
 *
 * Soft-deletes a group (sets deleted = true).
 * Auth: Bearer token (Auth0 access token).
 * Authorization: user must be ADMIN of the group.
 */
export async function DELETE(
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

  if (membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only group admins can delete the group" },
      { status: 403 },
    );
  }

  await db
    .update(snobGroupsTable)
    .set({ deleted: true })
    .where(eq(snobGroupsTable.id, groupId));

  return new NextResponse(null, { status: 204 });
}
