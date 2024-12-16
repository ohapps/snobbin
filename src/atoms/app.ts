import { SnobGroup } from "@/types/snobGroup";
import { atom } from "jotai";

export const selectedSnobGroup = atom<SnobGroup | undefined>(undefined);