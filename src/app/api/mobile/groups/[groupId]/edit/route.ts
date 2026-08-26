import { NextResponse } from "next/server";
import { eq, and, notInArray, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupAttributesTable,
  rankingItemAttributesTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import { UpdateGroupSchema } from "@/server/schemas/mobile-schemas";

/**
 * PUT /api/mobile/groups/:groupId/edit
 *
 * Updates an existing group and syncs its attributes.
 * Auth: Bearer token (Auth0 access token).
 * Authorization: user must be ADMIN of the group.
 */
export async function PUT(
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

  // Verify user is an ADMIN member of this group
  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 },
    );
  }

  if (membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only group admins can edit the group" },
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

  const parsed = UpdateGroupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const {
    name,
    description,
    minRanking,
    maxRanking,
    increments,
    rankIcon,
    rankingsRequired,
    pictureUrl,
    attributes,
  } = parsed.data;

  // Update the group
  await db
    .update(snobGroupsTable)
    .set({
      name,
      description,
      minRanking: minRanking.toString(),
      maxRanking: maxRanking.toString(),
      increments: increments.toString(),
      rankIcon,
      rankingsRequired: rankingsRequired.toString(),
      pictureUrl: pictureUrl || null,
    })
    .where(eq(snobGroupsTable.id, groupId));

  // Sync attributes
  const existingIds = attributes
    .filter((attr) => attr.id)
    .map((attr) => attr.id as string);

  // Find attribute IDs that will be removed
  const allGroupAttributes = await db
    .select({ id: snobGroupAttributesTable.id })
    .from(snobGroupAttributesTable)
    .where(eq(snobGroupAttributesTable.groupId, groupId));

  const attributeIdsToDelete = allGroupAttributes
    .map((a) => a.id)
    .filter((id) => !existingIds.includes(id));

  // Delete ranking_item_attributes referencing removed attributes
  if (attributeIdsToDelete.length > 0) {
    await db
      .delete(rankingItemAttributesTable)
      .where(inArray(rankingItemAttributesTable.attributeId, attributeIdsToDelete));
  }

  // Delete attributes that are no longer in the payload
  if (existingIds.length > 0) {
    await db
      .delete(snobGroupAttributesTable)
      .where(
        and(
          eq(snobGroupAttributesTable.groupId, groupId),
          notInArray(snobGroupAttributesTable.id, existingIds),
        ),
      );
  } else {
    // No existing attributes in payload — delete all for this group
    await db
      .delete(snobGroupAttributesTable)
      .where(eq(snobGroupAttributesTable.groupId, groupId));
  }

  // Update existing attributes
  for (const attr of attributes.filter((a) => a.id)) {
    await db
      .update(snobGroupAttributesTable)
      .set({ name: attr.name })
      .where(eq(snobGroupAttributesTable.id, attr.id as string));
  }

  // Insert new attributes (no id)
  const newAttributes = attributes.filter((a) => !a.id);
  if (newAttributes.length > 0) {
    await db.insert(snobGroupAttributesTable).values(
      newAttributes.map((attr) => ({
        id: generateNewId(),
        groupId,
        name: attr.name,
      })),
    );
  }

  return NextResponse.json({ id: groupId });
}
