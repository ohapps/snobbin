"use server";

import { snobGroupInvitesTable } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { ActionResponse } from "@/types/actions";
import { generateNewId } from "@/utils/generate-new-id";
import {
  CreateSnobGroupInvite,
  CreateSnobGroupInviteSchema,
  GroupInviteStatus,
} from "@/types/snobGroup";
import { getGroupForCurrentUser } from "@/server/utils/group/get-group-for-current-user";
import { logAndReturnError } from "@/server/utils/log-and-return-error";
import { nodemailerMailgun } from "@/server/email/email";

export const sendGroupInvite = async (
  invite: CreateSnobGroupInvite,
): Promise<ActionResponse> => {
  try {
    const validatedData = CreateSnobGroupInviteSchema.safeParse(invite);

    if (!validatedData.success) {
      console.error("send group invite validation error", validatedData.error);
      return { success: false, message: "error parsing group invite data" };
    }

    await getGroupForCurrentUser(invite.groupId);

    const invites = await db
      .select()
      .from(snobGroupInvitesTable)
      .where(
        and(
          eq(snobGroupInvitesTable.groupId, invite.groupId),
          eq(snobGroupInvitesTable.email, invite.email.toLowerCase()),
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
      groupId: invite.groupId,
      email: invite.email,
      status: GroupInviteStatus.PENDING,
    });

    const acceptLink = `${process.env.AUTH0_BASE_URL}/activity`;

    await nodemailerMailgun.sendMail({
      from: "noreply@ohapps.com",
      to: invite.email,
      subject: "You have been invited to join a group on Snobbin",
      text: `You have been invited to join a group on Snobbin. Click the link below to accept the invite:\n\n${acceptLink}`,
      html: `<p>You have been invited to join a group on Snobbin. Click the link below to accept the invite:</p>
             <p><a href="${acceptLink}">Accept Invite</a></p>`,
    });

    return { success: true };
  } catch (error) {
    return logAndReturnError("error sending group invite", error);
  }
};
