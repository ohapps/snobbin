import { NextResponse } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
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

/** Above this many changed items, tell the client to do a full re-mirror. */
const MAX_CHANGED_ITEMS = 500;

/**
 * GET /api/offline/groups/:groupId/changes?since=<ISO timestamp>
 *
 * Incremental refresh for an already-mirrored group:
 *  - `items`: items whose `updated_date` is after `since`, with *all* of their
 *    attributes and rankings (the client replaces them per item). Saving a
 *    ranking recalculates the item's average and bumps its `updated_date`, so
 *    ranking changes are covered too.
 *  - `itemIds`: every current item id in the group, so the client can prune
 *    hard-deleted items (deletes leave no row to timestamp).
 *  - `cursor`: pass back as `since` next time. Taken *before* querying, so a
 *    write that lands mid-request is picked up on the next call rather than lost.
 *
 * Returns `{ tooMany: true }` when more than MAX_CHANGED_ITEMS changed; the
 * client then falls back to a full paged re-mirror.
 *
 * Auth: Auth0 session cookie + active membership. Not gated by
 * `OFFLINE_ENABLED`, like the other `/api/offline/*` routes.
 */
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;
  const auth = await requireSessionMember(groupId);
  if (!auth.ok) return auth.response;

  const sinceParam = new URL(request.url).searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  if (!since || Number.isNaN(since.getTime())) {
    return NextResponse.json(
      { error: "`since` must be an ISO timestamp" },
      { status: 400 },
    );
  }

  const cursor = new Date().toISOString();

  const [changedItems, allIds] = await Promise.all([
    db
      .select()
      .from(rankingItemsTable)
      .where(
        and(
          eq(rankingItemsTable.groupId, groupId),
          gt(rankingItemsTable.updatedDate, since),
        ),
      )
      .limit(MAX_CHANGED_ITEMS + 1),
    db
      .select({ id: rankingItemsTable.id })
      .from(rankingItemsTable)
      .where(eq(rankingItemsTable.groupId, groupId)),
  ]);

  if (changedItems.length > MAX_CHANGED_ITEMS) {
    return NextResponse.json({ tooMany: true, cursor });
  }

  const changedIds = changedItems.map((i) => i.id);
  const [itemAttributes, rankings] =
    changedIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(rankingItemAttributesTable)
            .where(inArray(rankingItemAttributesTable.itemId, changedIds)),
          db
            .select()
            .from(rankingsTable)
            .where(inArray(rankingsTable.itemId, changedIds)),
        ])
      : [[], []];

  return NextResponse.json({
    tooMany: false,
    cursor,
    items: changedItems.map(formatItemResponse),
    itemAttributes: itemAttributes.map(formatItemAttributeResponse),
    rankings: rankings.map(formatRankingResponse),
    itemIds: allIds.map((r) => r.id),
  });
}
