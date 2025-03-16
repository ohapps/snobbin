'use server';

import { ActionResponse } from "@/types/actions";
import { SnobGroup, SnobGroupAttribute, SnobGroupRole, SnobGroupSchema } from "@/types/snobGroup";
import { getCurrentUser } from "../../utils/user/get-current-user";
import { db } from "@/server/db";
import { snobGroupsTable, snobGroupMembersTable, snobGroupAttributesTable } from "@/server/db/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { generateNewId } from "@/utils/generate-new-id";
import { Snob } from "@/types/snob";
import { getGroupForUser } from "@/server/utils/group/get-group-for-user";
import { logAndReturnError } from "@/server/utils/log-and-return-error";
import { group } from "console";

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

        for (let attribute of validatedData.data.attributes) {
            await updateOrCreateAttribute(attribute, updatedGroupId);
        }

        return { success: true };
    } catch (error) {
        return logAndReturnError('error saving group', error);
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

const updateOrCreateAttribute = async (attribute: SnobGroupAttribute, groupId: string) => {
    const rows = await db.select()
        .from(snobGroupAttributesTable)
        .where(and(
            eq(snobGroupAttributesTable.id, attribute.id),
            eq(snobGroupAttributesTable.groupId, groupId),
        ));
    if (rows.length === 0) {
        await db.insert(snobGroupAttributesTable).values({
            id: generateNewId(),
            groupId,
            name: attribute.name
        });
    } else {
        await db.update(snobGroupAttributesTable)
            .set({ name: attribute.name })
            .where(eq(snobGroupAttributesTable.id, attribute.id));
    }
}