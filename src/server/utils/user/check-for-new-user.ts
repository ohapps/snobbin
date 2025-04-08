import { db } from "@/server/db";
import { snobsTable } from "@/server/db/schema";
import { Session } from "@auth0/nextjs-auth0";
import { getUserFromSession } from "./get-user-from-session";

export const checkForNewUser = async (session: Session) => {
  const snob = await getUserFromSession(session);

  if (!snob) {
    await db.insert(snobsTable).values({
      id: session.user.sub,
      email: session.user.email,
      firstName: session.user.given_name,
      lastName: session.user.family_name,
      pictureUrl: session.user.picture,
    });
  }
};
