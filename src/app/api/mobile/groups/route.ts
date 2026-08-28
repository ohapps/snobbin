import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobGroupAttributesTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { requireAuth, parseBody } from "@/server/utils/api/route-guards";
import { CreateGroupSchema } from "@/server/schemas/mobile-schemas";

/**
 * POST /api/mobile/groups
 *
 * Creates a new group with optional attributes.
 * The authenticated user becomes the group ADMIN.
 * Auth: Bearer token (Auth0 access token).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, CreateGroupSchema);
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
    snobId: auth.userId,
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
