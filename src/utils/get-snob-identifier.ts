import { Snob } from "@/types/snob";

export const getSnobIdentifier = (snob?: Snob) => {
  if (snob) {
    return snob.firstName && snob.lastName
      ? `${snob.firstName} ${snob.lastName}`
      : snob.email;
  }
  return "";
};
