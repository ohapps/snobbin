import { getCurrentUser } from "./get-current-user";

export const getLastGroupId = async () => {
  const snob = await getCurrentUser();
  return snob.lastGroupId;
};
