import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { requireAuth, parseBody } from "@/server/utils/api/route-guards";
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

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, UpdateItemSchema);
  if (!body.ok) return body.response;

  const itemWithMembership = await getItemWithMembership(itemId, auth.userId);
  if (!itemWithMembership) {
    return NextResponse.json(
      { error: "Item not found or forbidden" },
      { status: 404 },
    );
  }

  const { description, imageId, imageUrl, attributes } = body.data;

  // Update the item
  await db
    .update(rankingItemsTable)
    .set({
      description,
      imageId: imageId || null,
      imageUrl: imageUrl || null,
      updatedDate: new Date(),
      updatedBy: auth.userId,
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

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const itemWithMembership = await getItemWithMembership(itemId, auth.userId);
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
