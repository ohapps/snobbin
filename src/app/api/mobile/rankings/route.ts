import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import {
  rankingsTable,
  rankingItemsTable,
  snobGroupMembersTable,
  snobGroupsTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { requireAuth, parseBody } from "@/server/utils/api/route-guards";
import { calcuateAverageRanking } from "@/server/utils/items/calculate-average-ranking";
import { PostRankingSchema } from "@/server/schemas/mobile-schemas";

/**
 * POST /api/mobile/rankings
 *
 * Creates or updates a ranking.
 * Auth: Bearer token (Auth0 access token).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, PostRankingSchema);
  if (!body.ok) return body.response;

  const { id, itemId, groupMemberId, ranking, notes } = body.data;

  // Verify the group member belongs to the authenticated user and fetch their groupId
  const member = await db
    .select({
      id: snobGroupMembersTable.id,
      snobId: snobGroupMembersTable.snobId,
      groupId: snobGroupMembersTable.groupId,
    })
    .from(snobGroupMembersTable)
    .where(eq(snobGroupMembersTable.id, groupMemberId))
    .limit(1);

  if (member.length === 0 || member[0].snobId !== auth.userId) {
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

  // Ensure item belongs to the same group as the group member
  if (item[0].groupId !== member[0].groupId) {
    return NextResponse.json(
      { error: "Item does not belong to the member's group" },
      { status: 400 },
    );
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
    // Update existing ranking, constrained by both ranking id and groupMemberId
    const updated = await db
      .update(rankingsTable)
      .set({
        ranking: ranking.toString(),
        notes: notes || null,
        updatedDate: now,
      })
      .where(
        and(
          eq(rankingsTable.id, id),
          eq(rankingsTable.groupMemberId, groupMemberId),
        ),
      )
      .returning({ id: rankingsTable.id });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Ranking not found or unauthorized to update" },
        { status: 404 },
      );
    }

    // Recalculate average ranking using shared logic
    await calcuateAverageRanking(itemId, rankingsRequired);

    return NextResponse.json({ id });
  } else {
    // Check if member already has a ranking for this item (uniqueness guard)
    const existingRanking = await db
      .select({ id: rankingsTable.id })
      .from(rankingsTable)
      .where(
        and(
          eq(rankingsTable.itemId, itemId),
          eq(rankingsTable.groupMemberId, groupMemberId),
        ),
      )
      .limit(1);

    if (existingRanking.length > 0) {
      return NextResponse.json(
        { error: "A ranking already exists for this member and item" },
        { status: 409 },
      );
    }

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
