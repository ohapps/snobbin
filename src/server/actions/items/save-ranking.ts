"use server";

import { ActionResponse } from "@/types/actions";
import { RankingSchema, RankingUpdate } from "@/types/rankings";
import { getItem } from "../../utils/items/get-item";
import { SnobGroupRole } from "@/types/snobGroup";
import { getCurrentUser } from "../../utils/user/get-current-user";
import { getGroupMemberForSnob } from "@/utils/get-group-member-for-snob";
import { logAndReturnError } from "../../utils/log-and-return-error";
import { getRanking } from "../../utils/items/get-ranking";
import { rankingsTable } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { generateNewId } from "@/utils/generate-new-id";
import { getGroupForUser } from "@/server/utils/group/get-group-for-user";
import { calcuateAverageRanking } from "@/server/utils/items/calculate-average-ranking";

export const saveRanking = async (
  data: RankingUpdate,
): Promise<ActionResponse> => {
  try {
    const validatedData = RankingSchema.safeParse(data);

    if (!validatedData.success) {
      return logAndReturnError(
        "error parsing ranking data",
        validatedData.error,
      );
    }

    const rankingItem = await getItem(data.itemId);
    const snob = await getCurrentUser();
    const group = await getGroupForUser(rankingItem.groupId, snob.id, [
      SnobGroupRole.MEMBER,
      SnobGroupRole.ADMIN,
    ]);
    const groupMember = getGroupMemberForSnob(group, snob);

    if (validatedData.data.id) {
      const ranking = await getRanking(validatedData.data.id);
      if (ranking.groupMemberId !== groupMember?.id) {
        return logAndReturnError("access denied to ranking", {});
      }

      await db
        .update(rankingsTable)
        .set({
          ranking: validatedData.data.ranking.toString(),
          notes: validatedData.data.notes,
          updatedDate: new Date(),
        })
        .where(eq(rankingsTable.id, validatedData.data.id));
    } else {
      await db.insert(rankingsTable).values({
        id: generateNewId(),
        itemId: rankingItem.id,
        groupMemberId: groupMember.id,
        ranking: validatedData.data.ranking.toString(),
        notes: validatedData.data.notes,
        createdDate: new Date(),
        updatedDate: new Date(),
      });
    }

    await calcuateAverageRanking(rankingItem.id, group);

    return { success: true };
  } catch (error) {
    return logAndReturnError("error saving ranking", error);
  }
};
