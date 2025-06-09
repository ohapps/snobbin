"use server";

import { ActionResponse } from "@/types/actions";
import { logAndReturnError } from "../../utils/log-and-return-error";
import { getItem } from "../../utils/items/get-item";
import { getCurrentUser } from "../../utils/user/get-current-user";
import { SnobGroupRole } from "@/types/snobGroup";
import { db } from "@/server/db";
import { rankingItemsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getGroupForUser } from "@/server/utils/group/get-group-for-user";

export const deleteItem = async (itemId: string): Promise<ActionResponse> => {
  try {
    const snob = await getCurrentUser();
    const rankingItem = await getItem(itemId);

    if (rankingItem.createdBy !== snob.id) {
      await getGroupForUser(rankingItem.groupId, snob.id, [
        SnobGroupRole.ADMIN,
      ]);
    }

    await db.delete(rankingItemsTable).where(eq(rankingItemsTable.id, itemId));

    return { success: true };
  } catch (error) {
    return logAndReturnError("failed to delete ranking item", error);
  }
};
