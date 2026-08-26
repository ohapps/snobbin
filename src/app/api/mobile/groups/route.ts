import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobGroupAttributesTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { CreateGroupSchema } from "@/server/schemas/mobile-schemas";

/**
 * POST /api/mobile/groups
 *
 * Creates a new group with optional attributes.
 * The authenticated user becomes the group ADMIN.
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

  const parsed = CreateGroupSchema.safeParse(body);

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

  const groupId = generateNewId();

  // Insert the group
  await db.insert(snobGroupsTable).values({
    id: groupId,
    name,
    description,
    minRanking: minRanking.toString(),
    maxRanking: maxRanking.toString(),
    increments: increments.toString(),
    rankIcon,
    rankingsRequired: rankingsRequired.toString(),
    pictureUrl: pictureUrl || null,
  });

  // Add creator as ADMIN member
  await db.insert(snobGroupMembersTable).values({
    id: generateNewId(),
    groupId,
    snobId: userId,
    role: "ADMIN",
  });

  // Insert attributes
  if (attributes.length > 0) {
    await db.insert(snobGroupAttributesTable).values(
      attributes.map((attr) => ({
        id: generateNewId(),
        groupId,
        name: attr.name,
      })),
    );
  }

  return NextResponse.json({ id: groupId }, { status: 201 });
}
