import { z } from "zod";
import { Snob } from "./snob";

export const SnobGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "group name is required"),
  description: z
    .string()
    .min(1, "group description is required")
    .max(500, "group description must be less than or equal to 500 characters"),
  minRanking: z.coerce
    .number()
    .min(0, "min ranking must be greater than or equal to 0"),
  maxRanking: z.coerce
    .number()
    .min(0, "max ranking must be greater than or equal to 0"),
  increments: z.coerce
    .number()
    .min(0, "increments must be greater than or equal to 0"),
  rankIcon: z.string().min(1, "rank icon is required"),
  rankingsRequired: z.coerce
    .number()
    .min(0, "rankings required must be greater than or equal to 0"),
  attributes: z.array(
    z.object({
      id: z.string().uuid(),
      name: z
        .string()
        .min(1, "attribute name is required")
        .max(50, "attribute name must be less than or equal to 50 characters"),
    }),
  ),
});

export enum SnobGroupRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  DISABLED = "DISABLED",
}

export type SnobGroupMember = {
  id: string;
  snob: Snob;
  role: SnobGroupRole;
};

export enum GroupInviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export type SnobGroupInvite = {
  id: string;
  email: string;
  status: GroupInviteStatus;
  groupId: string;
  groupName: string;
};

export type SnobGroupAttribute = {
  id: string;
  name: string;
};

export type SnobGroupAttributeSummary = {
  attributeId: string;
  attributeValue: string;
  count: number;
};

export type SnobGroup = {
  members: SnobGroupMember[];
  invites: SnobGroupInvite[];
  attributes: SnobGroupAttribute[];
} & z.infer<typeof SnobGroupSchema>;

export const newSnobGroup: SnobGroup = {
  id: undefined,
  name: "",
  description: "",
  minRanking: 1,
  maxRanking: 5,
  increments: 0.5,
  rankIcon: "star",
  rankingsRequired: 1,
  members: [],
  invites: [],
  attributes: [],
};
