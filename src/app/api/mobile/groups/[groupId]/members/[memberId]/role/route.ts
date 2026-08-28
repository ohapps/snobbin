import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { snobGroupMembersTable } from "@/server/db/schema";
import { requireAdmin } from "@/server/utils/api/route-guards";

const VALID_TRANSITIONS: Record<string, string[]> = {
  MEMBER: ["ADMIN", "DISABLED"],
  DISABLED: ["MEMBER"],
};

/**
 * PUT /api/mobile/groups/:groupId/members/:memberId/role
 *
 * Updates a group member's role.
 *
 * Body: { role: "ADMIN" | "DISABLED" | "MEMBER" }
 *
 * Rules:
 * - Caller must be ADMIN of the group.
 * - Cannot change own role (prevents self-demotion accidents).
 * - Cannot change another ADMIN's role.
 * - Transitions: MEMBER → ADMIN, MEMBER → DISABLED, DISABLED → MEMBER.
 */
export async function PUT(
  request: Request,
  { params }: { params: { groupId: string; memberId: string } },
) {
  const { groupId, memberId } = params;

  const auth = await requireAdmin(request, groupId);
  if (!auth.ok) return auth.response;

  // Parse body
  const body = await request.json();
  const { role } = body as { role: string };

  if (!role || !["ADMIN", "MEMBER", "DISABLED"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be ADMIN, MEMBER, or DISABLED" },
      { status: 400 },
    );
  }

  // Fetch target member
  const targetRows = await db
    .select()
    .from(snobGroupMembersTable)
    .where(
      and(
        eq(snobGroupMembersTable.id, memberId),
        eq(snobGroupMembersTable.groupId, groupId),
      ),
    )
    .limit(1);

  if (targetRows.length === 0) {
    return NextResponse.json(
      { error: "Member not found in this group" },
      { status: 404 },
    );
  }

  const target = targetRows[0];

  // Cannot modify your own role
  if (target.snobId === auth.userId) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  // Cannot modify another admin
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Cannot change another admin's role" },
      { status: 400 },
    );
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[target.role];
  if (!allowed || !allowed.includes(role)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${target.role} to ${role}`,
      },
      { status: 400 },
    );
  }

  // Apply update
  await db
    .update(snobGroupMembersTable)
    .set({ role })
    .where(eq(snobGroupMembersTable.id, memberId));

  return NextResponse.json({ success: true, memberId, role });
}
