'use server';

import { ServerResponse } from "@/types/actions";
import { Profile, ProfileSchema } from "@/types/snob";
import { getCurrentUser } from "../user/get-current-user";
import { db } from "@/db";
import { snobsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const saveProfile = async (data: Profile): Promise<ServerResponse> => {
    try {
        const validatedData = ProfileSchema.safeParse(data);

        if (!validatedData.success) {
            console.error('save profile validation error', validatedData.error);
            return { success: false, message: 'error parsing profile data' };
        }

        const snob = await getCurrentUser();

        await db.update(snobsTable).set({
            firstName: validatedData.data.firstName,
            lastName: validatedData.data.lastName
        }).where(eq(snobsTable.id, snob.id));

        return { success: true };
    } catch (error) {
        console.error('save profile error', error);
        return { success: false, message: 'error saving profile' };
    }
}