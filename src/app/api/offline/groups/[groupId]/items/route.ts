import { NextResponse } from "next/server";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  rankingItemsTable,
  rankingItemAttributesTable,
  rankingsTable,
} from "@/server/db/schema";
import { requireSessionMember } from "@/server/utils/api/offline-guards";
import {
  formatItemResponse,
  formatItemAttributeResponse,
  formatRankingResponse,
} from "@/server/utils/mobile/mobile-formatters";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/offline/groups/:groupId/items?page=N&pageSize=M
 *
 * One page of items plus the attributes and rankings for those items only.
 * Stable ordering by `(created_date DESC, id ASC)` so pages can be fetched
 * independently and safely (no overlap/skip) — essential for the resumable,
 * progressive sync of large (~1,600 item) groups.
 *
 * Auth: Auth0 session cookie + active membership.
 *
 * NOTE: intentionally *not* gated by `OFFLINE_ENABLED` — the background mirror
 * fill uses this in the normal deployed app.
 */
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;
  const auth = await requireSessionMember(groupId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(url.searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`, 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(rankingItemsTable)
    .where(eq(rankingItemsTable.groupId, groupId));

  const offset = (page - 1) * pageSize;

  const itemRows = await db
    .select()
    .from(rankingItemsTable)
    .where(eq(rankingItemsTable.groupId, groupId))
    .orderBy(desc(rankingItemsTable.createdDate), asc(rankingItemsTable.id))
    .limit(pageSize)
    .offset(offset);

  const itemIds = itemRows.map((i) => i.id);

  const [itemAttributes, rankings] = await Promise.all([
    itemIds.length > 0
      ? db
          .select()
          .from(rankingItemAttributesTable)
          .where(inArray(rankingItemAttributesTable.itemId, itemIds))
      : Promise.resolve([]),
    itemIds.length > 0
      ? db
          .select()
          .from(rankingsTable)
          .where(inArray(rankingsTable.itemId, itemIds))
      : Promise.resolve([]),
  ]);

  const totalNumber = Number(total);
  const complete = offset + itemRows.length >= totalNumber;

  return NextResponse.json({
    items: itemRows.map(formatItemResponse),
    itemAttributes: itemAttributes.map(formatItemAttributeResponse),
    rankings: rankings.map(formatRankingResponse),
    page,
    pageSize,
    total: totalNumber,
    complete,
  });
}
