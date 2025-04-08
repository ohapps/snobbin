"use server";

import { snobGroupInvitesTable } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { ActionResponse } from "@/types/actions";
import { generateNewId } from "@/utils/generate-new-id";
import { GroupInviteStatus } from "@/types/snobGroup";
import { getGroupForCurrentUser } from "@/server/utils/group/get-group-for-current-user";
import { logAndReturnError } from "@/server/utils/log-and-return-error";

export const sendGroupInvite = async (
  groupId: string,
  email: string,
): Promise<ActionResponse> => {
  try {
    await getGroupForCurrentUser(groupId);

    const invites = await db
      .select()
      .from(snobGroupInvitesTable)
      .where(
        and(
          eq(snobGroupInvitesTable.groupId, groupId),
          eq(snobGroupInvitesTable.email, email.toLowerCase()),
          inArray(snobGroupInvitesTable.status, [
            GroupInviteStatus.PENDING,
            GroupInviteStatus.ACCEPTED,
          ]),
        ),
      );

    if (invites.length > 0) {
      return {
        success: false,
        message: "group member with that email already exists",
      };
    }

    await db.insert(snobGroupInvitesTable).values({
      id: generateNewId(),
      groupId: groupId,
      email: email,
      status: GroupInviteStatus.PENDING,
    });

    return { success: true };
  } catch (error) {
    return logAndReturnError("error sending group invite", error);
  }
};
