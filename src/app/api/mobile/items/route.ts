import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { requireAuth, requireMember, parseBody } from "@/server/utils/api/route-guards";
import { CreateItemSchema } from "@/server/schemas/mobile-schemas";
import { saveItemAttributes } from "@/server/utils/items/item-utils";

/**
 * POST /api/mobile/items
 *
 * Creates a new ranking item with optional attributes.
 * Auth: Bearer token (Auth0 access token).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, CreateItemSchema);
  if (!body.ok) return body.response;

  const { groupId, description, imageId, imageUrl, attributes } = body.data;

  // Verify user is a member of this group (groupId comes from body)
  const memberAuth = await requireMember(request, groupId);
  if (!memberAuth.ok) return memberAuth.response;

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
    createdBy: auth.userId,
    updatedBy: auth.userId,
  });

  // Create attributes
  await saveItemAttributes(itemId, attributes);

  return NextResponse.json({ id: itemId }, { status: 201 });
}
