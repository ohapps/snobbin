import { db } from "@/server/db";
import { snobGroupInvitesTable, snobGroupsTable } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { GroupInviteStatus, SnobGroupInvite } from "@/types/snobGroup";
import { getCurrentUser } from "@/server/utils/user/get-current-user";

export const getPendingInvites = async (): Promise<SnobGroupInvite[]> => {
    const snob = await getCurrentUser();
    const invites = await db.select().from(snobGroupInvitesTable)
        .innerJoin(snobGroupsTable, eq(snobGroupInvitesTable.groupId, snobGroupsTable.id))
        .where(and(
            eq(snobGroupInvitesTable.email, snob.email),
            eq(snobGroupInvitesTable.status, GroupInviteStatus.PENDING),
        ));

    return invites.map((invite) => {
        return {
            id: invite.snob_group_invites.id,
            email: invite.snob_group_invites.email,
            status: invite.snob_group_invites.status as GroupInviteStatus,
            groupId: invite.snob_group_invites.groupId,
            groupName: invite.snob_groups.name,
        } as SnobGroupInvite
    });
}