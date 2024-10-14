import { db } from "@/db";
import { snobsTable } from "@/db/schema";
import { Session } from "@auth0/nextjs-auth0";
import { eq } from "drizzle-orm";

export const checkForNewUser = async (session: Session) => {

    const snobs = await db.select().from(snobsTable).where(eq(snobsTable.email, session.user.email));

    if (snobs.length === 0) {
        await db.insert(snobsTable).values({
            id: session.user.sub,
            email: session.user.email,
            firstName: session.user.given_name,
            lastName: session.user.family_name,
            pictureUrl: session.user.picture
        });
    }
}