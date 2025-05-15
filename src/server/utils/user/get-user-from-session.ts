import { db } from "@/server/db";
import { snobsTable } from "@/server/db/schema";
import { Snob } from "@/types/snob";
import { Session } from "@auth0/nextjs-auth0";
import { eq } from "drizzle-orm";

export const getUserFromSession = async (
  session: Session,
): Promise<Snob | null> => {
  const snobs = await db
    .select()
    .from(snobsTable)
    .where(eq(snobsTable.email, session.user.email));

  if (snobs.length === 1) {
    return {
      id: snobs[0].id,
      email: snobs[0].email,
      firstName: snobs[0].firstName,
      lastName: snobs[0].lastName,
      pictureUrl: snobs[0].pictureUrl,
      lastGroupId: snobs[0].lastGroupId,
    } as Snob;
  }

  return null;
};
