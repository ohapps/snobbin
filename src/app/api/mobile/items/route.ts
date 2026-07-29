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
      { status: 401 }
    );
  }

  const body = await request.json();
  const { groupId, description, imageId, imageUrl, attributes } = body as {
    groupId: string;
    description: string;
    imageId: string | null;
    imageUrl: string | null;
    attributes: Array<{ attributeId: string; attributeValue: string }>;
  };

  if (!groupId || !description) {
    return NextResponse.json(
      { error: "groupId and description are required" },
      { status: 400 }
    );
  }

  // Verify user is a member of this group
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

  return NextResponse.json({ id: itemId }, { status: 201 });
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
