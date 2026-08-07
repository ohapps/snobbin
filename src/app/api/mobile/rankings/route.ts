import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  rankingsTable,
  rankingItemsTable,
  snobGroupMembersTable,
  snobGroupsTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { calcuateAverageRanking } from "@/server/utils/items/calculate-average-ranking";
import { PostRankingSchema } from "@/server/schemas/mobile-schemas";

/**
 * POST /api/mobile/rankings
 *
 * Creates or updates a ranking.
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

  const body = await request.json();
  const parsed = PostRankingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { id, itemId, groupMemberId, ranking, notes } = parsed.data;

  // Verify the group member belongs to the authenticated user
  const member = await db
    .select({
      id: snobGroupMembersTable.id,
      snobId: snobGroupMembersTable.snobId,
    })
    .from(snobGroupMembersTable)
    .where(eq(snobGroupMembersTable.id, groupMemberId))
    .limit(1);

  if (member.length === 0 || member[0].snobId !== userId) {
    return NextResponse.json(
      { error: "Unauthorized — member does not belong to you" },
      { status: 403 },
    );
  }

  // Look up the item's group to get rankingsRequired
  const item = await db
    .select({
      groupId: rankingItemsTable.groupId,
    })
    .from(rankingItemsTable)
    .where(eq(rankingItemsTable.id, itemId))
    .limit(1);

  if (item.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const group = await db
    .select({ rankingsRequired: snobGroupsTable.rankingsRequired })
    .from(snobGroupsTable)
    .where(eq(snobGroupsTable.id, item[0].groupId))
    .limit(1);

  const rankingsRequired =
    group.length > 0 ? Number(group[0].rankingsRequired) : 1;

  const now = new Date();

  if (id) {
    // Update existing ranking
    await db
      .update(rankingsTable)
      .set({
        ranking: ranking.toString(),
        notes: notes || null,
        updatedDate: now,
      })
      .where(eq(rankingsTable.id, id));

    // Recalculate average ranking using shared logic
    await calcuateAverageRanking(itemId, rankingsRequired);

    return NextResponse.json({ id });
  } else {
    // Create new ranking
    const rankingId = generateNewId();

    await db.insert(rankingsTable).values({
      id: rankingId,
      itemId,
      groupMemberId,
      ranking: ranking.toString(),
      notes: notes || null,
      createdDate: now,
      updatedDate: now,
    });

    // Recalculate average ranking using shared logic
    await calcuateAverageRanking(itemId, rankingsRequired);

    return NextResponse.json({ id: rankingId }, { status: 201 });
  }
}
