import { SnobGroup, SnobGroupRole } from "@/types/snobGroup";
import { getCurrentUser } from "../user/get-current-user";
import { getGroupForUser } from "./get-group-for-user";

export const getGroupForCurrentUser = async (groupId: string): Promise<SnobGroup> => {
    const snob = await getCurrentUser();
    return getGroupForUser(groupId, snob.id, [SnobGroupRole.ADMIN, SnobGroupRole.MEMBER]);
}