import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupMembersTable,
  rankingItemsTable,
  rankingItemAttributesTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";

const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;

/**
 * PUT /api/mobile/items/:itemId
 *
 * Updates an existing ranking item's description, image, and attributes.
 * Auth: Bearer token (Auth0 access token).
 */
export async function PUT(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const { itemId } = params;

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { description, imageId, imageUrl, attributes } = body as {
    description: string;
    imageId: string | null;
    imageUrl: string | null;
    attributes: Array<{ attributeId: string; attributeValue: string }>;
  };

  if (!description) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  // Get the item to verify it exists and get its group
  const existingItem = await db
    .select({ id: rankingItemsTable.id, groupId: rankingItemsTable.groupId })
    .from(rankingItemsTable)
    .where(eq(rankingItemsTable.id, itemId))
    .limit(1);

  if (existingItem.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const groupId = existingItem[0].groupId;

  // Verify user is a member of the group
  const membership = await db
    .select({ id: snobGroupMembersTable.id })
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.groupId, groupId),
        eq(snobGroupMembersTable.snobId, userId),
        ne(snobGroupMembersTable.role, "DISABLED")
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 }
    );
  }

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

  // Replace attributes: delete existing, insert new
  await db
    .delete(rankingItemAttributesTable)
    .where(eq(rankingItemAttributesTable.itemId, itemId));

  if (attributes && attributes.length > 0) {
    for (const attr of attributes) {
      await db.insert(rankingItemAttributesTable).values({
        id: generateNewId(),
        itemId,
        attributeId: attr.attributeId,
        attributeValue: attr.attributeValue,
      });
    }
  }

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
  { params }: { params: { itemId: string } }
) {
  const { itemId } = params;

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 }
    );
  }

  // Get the item to verify it exists and get its group
  const existingItem = await db
    .select({ id: rankingItemsTable.id, groupId: rankingItemsTable.groupId })
    .from(rankingItemsTable)
    .where(eq(rankingItemsTable.id, itemId))
    .limit(1);

  if (existingItem.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const groupId = existingItem[0].groupId;

  // Verify user is an ADMIN of the group
  const membership = await db
    .select({ id: snobGroupMembersTable.id, role: snobGroupMembersTable.role })
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.groupId, groupId),
        eq(snobGroupMembersTable.snobId, userId)
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 }
    );
  }

  if (membership[0].role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only group admins can delete items" },
      { status: 403 }
    );
  }

  // Delete the item — ranking_item_attributes and rankings cascade automatically
  await db.delete(rankingItemsTable).where(eq(rankingItemsTable.id, itemId));

  return new NextResponse(null, { status: 204 });
}

async function getUserIdFromToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  if (!AUTH0_ISSUER_BASE_URL) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
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
