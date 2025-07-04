import { db } from "@/server/db";
import { snobGroupMembersTable, snobGroupsTable } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { SnobGroup, SnobGroupRole } from "@/types/snobGroup";
import { convertGroupEntityToModel } from "./convert-group-entity-to-model";
import { getCurrentUser } from "@/server/utils/user/get-current-user";

export const getCurrentUserGroups = async (): Promise<SnobGroup[]> => {
  const snob = await getCurrentUser();

  const groups = await db
    .selectDistinct({
      id: snobGroupsTable.id,
      name: snobGroupsTable.name,
      description: snobGroupsTable.description,
      rankIcon: snobGroupsTable.rankIcon,
      minRanking: snobGroupsTable.minRanking,
      maxRanking: snobGroupsTable.maxRanking,
      increments: snobGroupsTable.increments,
      rankingsRequired: snobGroupsTable.rankingsRequired,
      deleted: snobGroupsTable.deleted,
      pictureUrl: snobGroupsTable.pictureUrl,
    })
    .from(snobGroupsTable)
    .leftJoin(
      snobGroupMembersTable,
      eq(snobGroupsTable.id, snobGroupMembersTable.groupId),
    )
    .where(
      and(
        eq(snobGroupMembersTable.snobId, snob.id),
        eq(snobGroupsTable.deleted, false),
        ne(snobGroupMembersTable.role, SnobGroupRole.DISABLED),
      ),
    );

  return Promise.all(
    groups.map(async (group) => convertGroupEntityToModel(group)),
  );
};
