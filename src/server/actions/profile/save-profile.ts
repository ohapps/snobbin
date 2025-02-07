'use server';

import { ActionResponse } from "@/types/actions";
import { Profile, ProfileSchema } from "@/types/snob";
import { getCurrentUser } from "../../utils/user/get-current-user";
import { db } from "@/server/db";
import { snobsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logAndReturnError } from "@/server/utils/log-and-return-error";

export const saveProfile = async (data: Profile): Promise<ActionResponse> => {
    try {
        const validatedData = ProfileSchema.safeParse(data);

        if (!validatedData.success) {
            return logAndReturnError('save profile validation error', validatedData.error);
        }

        const snob = await getCurrentUser();

        await db.update(snobsTable).set({
            firstName: validatedData.data.firstName,
            lastName: validatedData.data.lastName
        }).where(eq(snobsTable.id, snob.id));

        return { success: true };
    } catch (error) {
        return logAndReturnError('save profile error', error);
    }
}