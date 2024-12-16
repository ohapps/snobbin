import { z } from "zod";
import { Snob } from "./snob";

export const SnobGroupSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'group name is required'),
    description: z.string().min(1, 'group description is required').max(500, 'group description must be less than or equal to 500 characters'),
    minRanking: z.coerce.number().min(0, 'min ranking must be greater than or equal to 0'),
    maxRanking: z.coerce.number().min(0, 'max ranking must be greater than or equal to 0'),
    increments: z.coerce.number().min(0, 'increments must be greater than or equal to 0'),
    rankIcon: z.string().min(1, 'rank icon is required'),
    rankingsRequired: z.coerce.number().min(0, 'rankings required must be greater than or equal to 0'),
});

export enum SnobGroupRole {
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER'
}

export type SnobGroupMember = {
    snob: Snob;
    role: SnobGroupRole;
}

export enum GroupInviteStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

export type SnobGroupInvite = {
    id: string;
    email: string;
    status: GroupInviteStatus;
    groupId: string;
    groupName: string;
};

export type SnobGroup = {
    members: SnobGroupMember[];
    invites: SnobGroupInvite[];
} & z.infer<typeof SnobGroupSchema>;

export const newSnobGroup: SnobGroup = {
    id: undefined,
    name: '',
    description: '',
    minRanking: 1,
    maxRanking: 5,
    increments: .5,
    rankIcon: 'star',
    rankingsRequired: 1,
    members: [],
    invites: [],
}

