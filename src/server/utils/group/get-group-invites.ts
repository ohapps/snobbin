import { db } from "@/server/db";
import { SelectSnobGroup, snobGroupInvitesTable } from "@/server/db/schema";
import { SnobGroupInvite } from "@/types/snobGroup";
import { eq } from "drizzle-orm";

export const getGroupInvites = async (group: SelectSnobGroup) => {
    return (await db.select().from(snobGroupInvitesTable).where(eq(snobGroupInvitesTable.groupId, group.id))).map((invite) => {
        return {
            ...invite,
            groupName: group.name
        } as SnobGroupInvite
    });
}