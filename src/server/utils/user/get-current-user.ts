import { getSession } from "@auth0/nextjs-auth0";
import { getUserFromSession } from "./get-user-from-session";
import { Snob } from "@/types/snob";

export const getCurrentUser = async (): Promise<Snob> => {
  const session = await getSession();

  if (!session) {
    throw new Error("No session found for current user");
  }

  const snob = await getUserFromSession(session);

  if (!snob) {
    throw new Error("No snob found for current session");
  }

  return snob;
};
