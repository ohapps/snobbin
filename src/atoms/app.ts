import { RankingItem } from "@/types/rankings";
import { SnobGroup } from "@/types/snobGroup";
import { atom } from "jotai";

export const selectedSnobGroup = atom<SnobGroup | undefined>(undefined);
export const selectedRankingItem = atom<RankingItem | undefined>(undefined);