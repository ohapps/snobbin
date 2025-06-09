"use server";

import { ActionResponse } from "@/types/actions";
import {
  RankingItem,
  RankingItemSchema,
  RankItemUpdate,
} from "@/types/rankings";
import { logAndReturnError } from "../../utils/log-and-return-error";
import { db } from "@/server/db";
import {
  rankingItemAttributesTable,
  rankingItemsTable,
} from "@/server/db/schema";
import { generateNewId } from "@/utils/generate-new-id";
import { eq } from "drizzle-orm";
import { getGroupForCurrentUser } from "@/server/utils/group/get-group-for-current-user";
import { getCurrentUser } from "@/server/utils/user/get-current-user";
import { SnobGroupRole } from "@/types/snobGroup";
import { getGroupForUser } from "@/server/utils/group/get-group-for-user";
import { Snob } from "@/types/snob";
import { getItem } from "../../utils/items/get-item";

const createOrUpdateRankingItem = async (
  item: RankItemUpdate,
  snob: Snob,
): Promise<string> => {
  if (item.id) {
    await db
      .update(rankingItemsTable)
      .set({
        description: item.description,
        imageId: item.imageId,
        imageUrl: item.imageUrl,
        updatedDate: new Date(),
        updatedBy: snob.id,
      })
      .where(eq(rankingItemsTable.id, item.id));
    return item.id;
  } else {
    const id = generateNewId();
    await db.insert(rankingItemsTable).values({
      id,
      groupId: item.groupId,
      description: item.description,
      imageId: item.imageId,
      imageUrl: item.imageUrl,
      ranked: false,
      createdDate: new Date(),
      createdBy: snob.id,
      updatedDate: new Date(),
      updatedBy: snob.id,
    });
    return id;
  }
};

export const saveItem = async (item: RankingItem): Promise<ActionResponse> => {
  try {
    const validatedData = RankingItemSchema.safeParse(item);

    if (!validatedData.success) {
      return logAndReturnError(
        "error parsing ranking item data",
        validatedData.error,
      );
    }

    const snob = await getCurrentUser();

    if (item.id) {
      // If updating, ensure the user is the creator or an admin of the group
      const rankingItem = await getItem(item.id);
      if (rankingItem.createdBy !== snob.id) {
        await getGroupForUser(rankingItem.groupId, snob.id, [
          SnobGroupRole.ADMIN,
        ]);
      }
    } else {
      // If creating, ensure the user is a member of the group
      await getGroupForCurrentUser(item.groupId);
    }

    const itemId = await createOrUpdateRankingItem(validatedData.data, snob);

    item.attributes.forEach(async (attribute) => {
      if (!attribute.id) {
        await db.insert(rankingItemAttributesTable).values({
          id: generateNewId(),
          itemId,
          attributeId: attribute.attributeId,
          attributeValue: attribute.attributeValue,
        });
      } else {
        await db
          .update(rankingItemAttributesTable)
          .set({ attributeValue: attribute.attributeValue })
          .where(eq(rankingItemAttributesTable.id, attribute.id));
      }
    });

    return { success: true };
  } catch (error) {
    return logAndReturnError("error saving ranking item", error);
  }
};
