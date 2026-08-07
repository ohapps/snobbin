import { eq, and, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { snobGroupMembersTable } from "@/server/db/schema";

export interface GroupMembership {
  id: string;
  role: string;
}

/**
 * Verifies that a user is an active (non-DISABLED) member of a group.
 * Returns the membership record if found, or null if the user is not a member.
 *
 * Use this in route handlers to gate access to group resources.
 *
 * @example
 * ```ts
 * const membership = await getActiveMembership(groupId, userId);
 * if (!membership) {
 *   return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
 * }
 * // Optionally check role:
 * if (membership.role !== "ADMIN") { ... }
 * ```
 */
export async function getActiveMembership(
  groupId: string,
  userId: string,
): Promise<GroupMembership | null> {
  const rows = await db
    .select({
      id: snobGroupMembersTable.id,
      role: snobGroupMembersTable.role,
    })
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.groupId, groupId),
        eq(snobGroupMembersTable.snobId, userId),
        ne(snobGroupMembersTable.role, "DISABLED"),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;

  return { id: rows[0].id, role: rows[0].role };
}
