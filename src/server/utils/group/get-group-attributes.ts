import { db } from "@/server/db";
import { SelectSnobGroup, snobGroupAttributesTable } from "@/server/db/schema";
import { SnobGroupAttribute } from "@/types/snobGroup";
import { eq } from "drizzle-orm";

export const getGroupAttributes = async (group: SelectSnobGroup) => {
  return (
    await db
      .select()
      .from(snobGroupAttributesTable)
      .where(eq(snobGroupAttributesTable.groupId, group.id))
  ).map((attribute) => {
    return {
      id: attribute.id,
      name: attribute.name,
    } as SnobGroupAttribute;
  });
};
