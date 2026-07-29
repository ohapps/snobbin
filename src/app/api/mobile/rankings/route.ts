import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  rankingsTable,
  rankingItemsTable,
  snobGroupMembersTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";

const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;

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
      { status: 401 }
    );
  }

  const body = await request.json();
  const { id, itemId, groupMemberId, ranking, notes } = body as {
    id?: string;
    itemId: string;
    groupMemberId: string;
    ranking: number;
    notes: string | null;
  };

  if (!itemId || !groupMemberId || ranking === undefined) {
    return NextResponse.json(
      { error: "itemId, groupMemberId, and ranking are required" },
      { status: 400 }
    );
  }

  // Verify the group member belongs to the authenticated user
  const member = await db
    .select({ id: snobGroupMembersTable.id, snobId: snobGroupMembersTable.snobId })
    .from(snobGroupMembersTable)
    .where(eq(snobGroupMembersTable.id, groupMemberId))
    .limit(1);

  if (member.length === 0 || member[0].snobId !== userId) {
    return NextResponse.json(
      { error: "Unauthorized — member does not belong to you" },
      { status: 403 }
    );
  }

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

    // Recalculate average ranking for this item
    await recalculateAverageRanking(itemId);

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

    // Recalculate average ranking for this item
    await recalculateAverageRanking(itemId);

    return NextResponse.json({ id: rankingId }, { status: 201 });
  }
}

/**
 * Recalculates the average ranking for an item based on all its rankings.
 * Also marks the item as ranked if it has any rankings.
 */
async function recalculateAverageRanking(itemId: string): Promise<void> {
  const allRankings = await db
    .select({ ranking: rankingsTable.ranking })
    .from(rankingsTable)
    .where(eq(rankingsTable.itemId, itemId));

  if (allRankings.length === 0) {
    await db
      .update(rankingItemsTable)
      .set({ averageRanking: null, ranked: false, updatedDate: new Date() })
      .where(eq(rankingItemsTable.id, itemId));
    return;
  }

  const total = allRankings.reduce((sum, r) => sum + Number(r.ranking), 0);
  const average = total / allRankings.length;

  await db
    .update(rankingItemsTable)
    .set({
      averageRanking: average.toString(),
      ranked: true,
      updatedDate: new Date(),
    })
    .where(eq(rankingItemsTable.id, itemId));
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
