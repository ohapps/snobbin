import { NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/server/db";
import {
  snobGroupsTable,
  snobGroupMembersTable,
  snobsTable,
} from "@/server/db/schema";
import { requireSession } from "@/server/utils/api/offline-guards";
import {
  formatGroupResponse,
  formatMemberResponse,
  formatSnobResponse,
} from "@/server/utils/mobile/mobile-formatters";

/**
 * GET /api/offline/bootstrap
 *
 * Identity + groups + memberships + snobs, for seeding the offline mirror.
 * Auth: Auth0 session cookie.
 *
 * Mirrors the shape of `/api/mobile/user/:userId/groups` but keyed off the
 * session.
 *
 * NOTE: intentionally *not* gated by `OFFLINE_ENABLED`. The mirror is filled in
 * the background on every group page load, so these endpoints must stay
 * reachable in the normal deployed app. The flag gates the offline read-only
 * *UI* instead.
 */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const userId = auth.snob.id ?? "";

  const userMemberships = await db
    .select()
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.snobId, userId),
        ne(snobGroupMembersTable.role, "DISABLED"),
      ),
    );

  if (userMemberships.length === 0) {
    return NextResponse.json({
      snob: formatSnobResponse({
        id: auth.snob.id ?? "",
        email: auth.snob.email,
        firstName: auth.snob.firstName ?? null,
        lastName: auth.snob.lastName ?? null,
        pictureUrl: auth.snob.pictureUrl ?? null,
        lastGroupId: auth.snob.lastGroupId ?? null,
        isPremium: auth.snob.isPremium ?? false,
      }),
      groups: [],
      memberships: [],
      snobs: [],
    });
  }

  // Soft-deleted groups are excluded so the client never mirrors (or creates
  // sync state for) a group it can no longer show.
  const groups = await db
    .select()
    .from(snobGroupsTable)
    .where(
      and(
        inArray(
          snobGroupsTable.id,
          userMemberships.map((m) => m.groupId),
        ),
        eq(snobGroupsTable.deleted, false),
      ),
    );
  const groupIds = groups.map((g) => g.id);

  const memberships =
    groupIds.length > 0
      ? await db
          .select()
          .from(snobGroupMembersTable)
          .where(inArray(snobGroupMembersTable.groupId, groupIds))
      : [];

  const snobIds = Array.from(new Set(memberships.map((m) => m.snobId)));
  const snobs =
    snobIds.length > 0
      ? await db
          .select()
          .from(snobsTable)
          .where(inArray(snobsTable.id, snobIds))
      : [];

  return NextResponse.json({
    snob: formatSnobResponse({
      id: auth.snob.id ?? "",
      email: auth.snob.email,
      firstName: auth.snob.firstName ?? null,
      lastName: auth.snob.lastName ?? null,
      pictureUrl: auth.snob.pictureUrl ?? null,
      lastGroupId: auth.snob.lastGroupId ?? null,
      isPremium: auth.snob.isPremium ?? false,
    }),
    groups: groups.map(formatGroupResponse),
    memberships: memberships.map(formatMemberResponse),
    snobs: snobs.map(formatSnobResponse),
  });
}
