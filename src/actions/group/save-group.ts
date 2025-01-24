'use server';

import { ActionResponse } from "@/types/actions";
import { SnobGroup, SnobGroupRole, SnobGroupSchema } from "@/types/snobGroup";
import { getCurrentUser } from "../user/get-current-user";
import { db } from "@/db";
import { snobGroupsTable, snobGroupMembersTable, snobGroupAttributesTable } from "@/db/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { generateNewId } from "@/utils/generate-new-id";
import { getGroupForUser } from "./get-group-for-user";
import { Snob } from "@/types/snob";

export const saveGroup = async (data: SnobGroup): Promise<ActionResponse> => {
    try {
        const validatedData = SnobGroupSchema.safeParse(data);

        if (!validatedData.success) {
            console.error('save group validation error', validatedData.error);
            return { success: false, message: 'error parsing group data' };
        }

        const snob = await getCurrentUser();
        const updatedGroupId = await updateOrCreateGroup(validatedData.data as SnobGroup, snob);

        const attributesIds: string[] = validatedData.data.attributes.map((attribute) => attribute.id).filter((id) => id !== undefined);
        await db.delete(snobGroupAttributesTable).where(
            and(eq(snobGroupAttributesTable.groupId, updatedGroupId), notInArray(snobGroupAttributesTable.id, attributesIds))
        );

        validatedData.data.attributes.forEach(async (attribute) => {
            if (!attribute.id) {
                await db.insert(snobGroupAttributesTable).values({
                    id: generateNewId(),
                    groupId: updatedGroupId,
                    name: attribute.name
                });
            } else {
                await db.update(snobGroupAttributesTable)
                    .set({ name: attribute.name })
                    .where(eq(snobGroupAttributesTable.id, attribute.id));
            }
        });

        return { success: true };
    } catch (error) {
        console.error('save group error', error);
        return { success: false, message: 'error saving group' };
    }
}

const updateOrCreateGroup = async (data: SnobGroup, snob: Snob): Promise<string> => {
    const values = {
        name: data.name,
        description: data.description,
        minRanking: data.minRanking.toString(),
        maxRanking: data.maxRanking.toString(),
        increments: data.increments.toString(),
        rankIcon: data.rankIcon,
        rankingsRequired: data.rankingsRequired.toString()
    }

    if (data.id) {
        await getGroupForUser(data.id, snob.id, [SnobGroupRole.ADMIN]);

        await db.update(snobGroupsTable)
            .set(values)
            .where(eq(snobGroupsTable.id, data.id));

        return data.id;
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

        return newGroup[0].id;
    }
}