"use server";

import { db } from "@/server/db";
import { snobGroupMembersTable } from "@/server/db/schema";
import { getGroupForUser } from "@/server/utils/group/get-group-for-user";
import { logAndReturnError } from "@/server/utils/log-and-return-error";
import { getCurrentUser } from "@/server/utils/user/get-current-user";
import { ActionResponse } from "@/types/actions";
import { SnobGroupRole } from "@/types/snobGroup";
import { and, eq } from "drizzle-orm";

export const enableGroupMember = async (
  groupId: string,
  snobId: string,
): Promise<ActionResponse> => {
  try {
    const snob = await getCurrentUser();
    const group = await getGroupForUser(groupId, snob.id, [
      SnobGroupRole.ADMIN,
    ]);

    const results = await db
      .update(snobGroupMembersTable)
      .set({ role: SnobGroupRole.MEMBER })
      .where(
        and(
          eq(snobGroupMembersTable.groupId, group.id ?? ""),
          eq(snobGroupMembersTable.snobId, snobId),
          eq(snobGroupMembersTable.role, SnobGroupRole.DISABLED),
        ),
      )
      .returning();

    if (results.length === 0) {
      throw new Error("No changes made, member not found or already enabled");
    }
    return { success: true };
  } catch (error) {
    return logAndReturnError("failed to enable group member", error);
  }
};
