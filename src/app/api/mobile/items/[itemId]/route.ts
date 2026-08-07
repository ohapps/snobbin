import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { UpdateItemSchema } from "@/server/schemas/mobile-schemas";
import {
  getItemWithMembership,
  saveItemAttributes,
} from "@/server/utils/items/item-utils";

/**
 * PUT /api/mobile/items/:itemId
 *
 * Updates an existing ranking item's description, image, and attributes.
 * Auth: Bearer token (Auth0 access token).
 */
export async function PUT(
  request: Request,
  { params }: { params: { itemId: string } },
) {
  const { itemId } = params;

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = UpdateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const itemWithMembership = await getItemWithMembership(itemId, userId);
  if (!itemWithMembership) {
    return NextResponse.json(
      { error: "Item not found or forbidden" },
      { status: 404 },
    );
  }

  const { description, imageId, imageUrl, attributes } = parsed.data;

  // Update the item
  await db
    .update(rankingItemsTable)
    .set({
      description,
      imageId: imageId || null,
      imageUrl: imageUrl || null,
      updatedDate: new Date(),
      updatedBy: userId,
    })
    .where(eq(rankingItemsTable.id, itemId));

  // Replace attributes
  await saveItemAttributes(itemId, attributes, true);

  return NextResponse.json({ id: itemId });
}

/**
 * DELETE /api/mobile/items/:itemId
 *
 * Deletes a ranking item and all associated attributes/rankings (via cascade).
 * Auth: Bearer token (Auth0 access token).
 * Only ADMIN members of the group can delete items.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } },
) {
  const { itemId } = params;

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 },
    );
  }

  const itemWithMembership = await getItemWithMembership(itemId, userId);
  if (!itemWithMembership) {
    return NextResponse.json(
      { error: "Item not found or forbidden" },
      { status: 404 },
    );
  }

  if (itemWithMembership.membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only group admins can delete items" },
      { status: 403 },
    );
  }

  // Delete the item — ranking_item_attributes and rankings cascade automatically
  await db.delete(rankingItemsTable).where(eq(rankingItemsTable.id, itemId));

  return new NextResponse(null, { status: 204 });
}
