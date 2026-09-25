export type GroupEventType = "ITEM_ADDED" | "ITEM_MODIFIED" | "RANKING_ADDED";

export type ItemAddedPayload = {
  type: "ITEM_ADDED";
  groupId: string;
  itemId: string;
  description: string;
  createdBy: {
    id: string;
    name?: string | null;
  };
  timestamp: string;
};

export type ItemModifiedPayload = {
  type: "ITEM_MODIFIED";
  groupId: string;
  itemId: string;
  description: string;
  createdBy: {
    id: string;
    name?: string | null;
  };
  timestamp: string;
};

export type RankingAddedPayload = {
  type: "RANKING_ADDED";
  groupId: string;
  itemId: string;
  itemDescription: string;
  ranking: number;
  createdBy: {
    id: string;
    name?: string | null;
  };
  timestamp: string;
};

export type GroupEvent =
  | ItemAddedPayload
  | ItemModifiedPayload
  | RankingAddedPayload;
