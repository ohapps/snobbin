import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import { CreateItemSchema } from "@/server/schemas/mobile-schemas";
import { saveItemAttributes } from "@/server/utils/items/item-utils";

/**
 * POST /api/mobile/items
 *
 * Creates a new ranking item with optional attributes.
 * Auth: Bearer token (Auth0 access token).
 */
export async function POST(request: Request) {
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 },
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

  const parsed = CreateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { groupId, description, imageId, imageUrl, attributes } = parsed.data;

  // Verify user is a member of this group
  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 },
    );
  }

  // Create the item
  const itemId = generateNewId();
  const now = new Date();

  await db.insert(rankingItemsTable).values({
    id: itemId,
    groupId,
    description,
    imageId: imageId || null,
    imageUrl: imageUrl || null,
    ranked: false,
    createdDate: now,
    updatedDate: now,
    createdBy: userId,
    updatedBy: userId,
  });

  // Create attributes
  await saveItemAttributes(itemId, attributes);

  return NextResponse.json({ id: itemId }, { status: 201 });
}
