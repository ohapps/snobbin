import { NextResponse } from "next/server";
import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobGroupAttributesTable,
  snobGroupInvitesTable,
  rankingItemsTable,
  snobsTable,
} from "@/server/db/schema";
import { requireSessionMember } from "@/server/utils/api/offline-guards";
import {
  formatGroupResponse,
  formatMemberResponse,
  formatSnobResponse,
  formatAttributeResponse,
} from "@/server/utils/mobile/mobile-formatters";

/**
 * GET /api/offline/groups/:groupId/meta
 *
 * Small per-group metadata: group, members, snobs, attributes, invites, and the
 * total item count (so the client can render sync progress).
 * Auth: Auth0 session cookie + active membership.
 *
 * NOTE: intentionally *not* gated by `OFFLINE_ENABLED` — the background mirror
 * fill uses this in the normal deployed app.
 */
export async function GET(
  _request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;
  const auth = await requireSessionMember(groupId);
  if (!auth.ok) return auth.response;

  const [groupRows, members, attributes, invites, itemCountRows] =
    await Promise.all([
      db
        .select()
        .from(snobGroupsTable)
        .where(eq(snobGroupsTable.id, groupId)),
      db
        .select()
        .from(snobGroupMembersTable)
        .where(eq(snobGroupMembersTable.groupId, groupId)),
      db
        .select()
        .from(snobGroupAttributesTable)
        .where(eq(snobGroupAttributesTable.groupId, groupId)),
      db
        .select()
        .from(snobGroupInvitesTable)
        .where(eq(snobGroupInvitesTable.groupId, groupId)),
      db
        .select({ count: count() })
        .from(rankingItemsTable)
        .where(eq(rankingItemsTable.groupId, groupId)),
    ]);

  if (groupRows.length === 0) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const memberSnobIds = Array.from(new Set(members.map((m) => m.snobId)));
  const snobs =
    memberSnobIds.length > 0
      ? await db
          .select()
          .from(snobsTable)
          .where(inArray(snobsTable.id, memberSnobIds))
      : [];

  return NextResponse.json({
    group: formatGroupResponse(groupRows[0]),
    members: members.map(formatMemberResponse),
    snobs: snobs.map(formatSnobResponse),
    attributes: attributes.map(formatAttributeResponse),
    invites: invites.map((i) => ({
      id: i.id,
      group_id: i.groupId,
      email: i.email,
      status: i.status,
    })),
    totalItems: Number(itemCountRows[0]?.count ?? 0),
  });
}
