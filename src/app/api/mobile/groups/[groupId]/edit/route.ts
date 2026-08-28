import { NextResponse } from "next/server";
import { eq, and, notInArray, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupAttributesTable,
  rankingItemAttributesTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { requireAdmin, parseBody } from "@/server/utils/api/route-guards";
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

  const auth = await requireAdmin(request, groupId);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, UpdateGroupSchema);
  if (!body.ok) return body.response;

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
  } = body.data;

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
      .where(
        inArray(rankingItemAttributesTable.attributeId, attributeIdsToDelete),
      );
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
