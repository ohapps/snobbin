'use server';

import { ActionResponse } from "@/types/actions";
import { SnobGroup, SnobGroupRole, SnobGroupSchema } from "@/types/snobGroup";
import { getCurrentUser } from "../user/get-current-user";
import { db } from "@/db";
import { snobGroupsTable, snobGroupMembersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateNewId } from "@/utils/generate-new-id";
import { getGroupForUser } from "./get-group-for-user";

export const saveGroup = async (data: SnobGroup): Promise<ActionResponse> => {
    try {
        const validatedData = SnobGroupSchema.safeParse(data);

        if (!validatedData.success) {
            console.error('save group validation error', validatedData.error);
            return { success: false, message: 'error parsing group data' };
        }

        const snob = await getCurrentUser();

        const values = {
            name: validatedData.data.name,
            description: validatedData.data.description,
            minRanking: validatedData.data.minRanking.toString(),
            maxRanking: validatedData.data.maxRanking.toString(),
            increments: validatedData.data.increments.toString(),
            rankIcon: validatedData.data.rankIcon,
            rankingsRequired: validatedData.data.rankingsRequired.toString()
        }

        if (validatedData.data.id) {
            await getGroupForUser(validatedData.data.id, snob.id, [SnobGroupRole.ADMIN]);

            await db.update(snobGroupsTable)
                .set(values)
                .where(eq(snobGroupsTable.id, validatedData.data.id));
        } else {
            const newGroup = await db.insert(snobGroupsTable).values({
                id: generateNewId(),
                ...values
            }).returning();

            await db.insert(snobGroupMembersTable).values({
                id: generateNewId(),
                groupId: newGroup[0].id,
                snobId: snob.id,
                role: SnobGroupRole.ADMIN
            });
        }

        return { success: true };
    } catch (error) {
        console.error('save group error', error);
        return { success: false, message: 'error saving group' };
    }
}