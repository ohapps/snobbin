import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  rankingItemsTable,
  rankingItemAttributesTable,
} from "@/server/db/schema";
import { getActiveMembership, GroupMembership } from "@/server/utils/group/get-active-membership";
import { generateNewId } from "@/utils/generate-new-id";

export interface ItemWithMembership {
  item: { id: string; groupId: string };
  membership: GroupMembership;
}

/**
 * Fetches an item by ID and verifies if the user has an active membership in the item's group.
 * Returns { item, membership } if valid, or null if item doesn't exist or user is not an active member.
 */
export async function getItemWithMembership(
  itemId: string,
  userId: string
): Promise<ItemWithMembership | null> {
  const existingItem = await db
    .select({ id: rankingItemsTable.id, groupId: rankingItemsTable.groupId })
    .from(rankingItemsTable)
    .where(eq(rankingItemsTable.id, itemId))
    .limit(1);

  if (existingItem.length === 0) {
    return null;
  }

  const groupId = existingItem[0].groupId;
  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    return null;
  }

  return {
    item: existingItem[0],
    membership,
  };
}

/**
 * Inserts item attributes for a ranking item. If replace is true, existing attributes are deleted first.
 */
export async function saveItemAttributes(
  itemId: string,
  attributes: Array<{ attributeId: string; attributeValue: string }>,
  replace: boolean = false
) {
  if (replace) {
    await db
      .delete(rankingItemAttributesTable)
      .where(eq(rankingItemAttributesTable.itemId, itemId));
  }

  if (attributes && attributes.length > 0) {
    for (const attr of attributes) {
      await db.insert(rankingItemAttributesTable).values({
        id: generateNewId(),
        itemId,
        attributeId: attr.attributeId,
        attributeValue: attr.attributeValue,
      });
    }
  }
}
