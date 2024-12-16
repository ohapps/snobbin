import { db } from "@/db";
import { snobGroupMembersTable, snobsTable } from "@/db/schema";
import { SnobGroupMember, SnobGroupRole } from "@/types/snobGroup";
import { eq } from "drizzle-orm";

export const getGroupMembers = async (groupId: string): Promise<SnobGroupMember[]> => {

    const snobs = await db.select().from(snobsTable)
        .leftJoin(snobGroupMembersTable, eq(snobsTable.id, snobGroupMembersTable.snobId))
        .where(eq(snobGroupMembersTable.groupId, groupId));

    return snobs.map((s) => {
        return {
            snob: s.snobs,
            role: s.snob_group_members?.role as SnobGroupRole ?? SnobGroupRole.MEMBER
        }
    });
}