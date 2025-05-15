import { SnobGroup } from "@/types/snobGroup";
import { getCurrentUser } from "./get-current-user";
import { db } from "@/server/db";
import { snobsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const updateLastGroup = async (snobGroup: SnobGroup) => {
  const snob = await getCurrentUser();
  await db
    .update(snobsTable)
    .set({
      lastGroupId: snobGroup.id,
    })
    .where(eq(snobsTable.id, snob.id));
};
