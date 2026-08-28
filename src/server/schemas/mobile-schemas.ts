import { z } from "zod";

export const AttributeInputSchema = z.object({
  attributeId: z.string().min(1, "attributeId is required"),
  attributeValue: z.string(),
});

export const CreateItemSchema = z.object({
  groupId: z.string().min(1, "groupId is required"),
  description: z.string().min(1, "description is required"),
  imageId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  attributes: z.array(AttributeInputSchema).optional().default([]),
});

export const UpdateItemSchema = z.object({
  description: z.string().min(1, "description is required"),
  imageId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  attributes: z.array(AttributeInputSchema).optional().default([]),
});

export const PostRankingSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().min(1, "itemId is required"),
  groupMemberId: z.string().min(1, "groupMemberId is required"),
  ranking: z.number({ required_error: "ranking is required" }),
  notes: z.string().nullable().optional(),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type PostRankingInput = z.infer<typeof PostRankingSchema>;

export const GroupAttributeSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "attribute name is required")
    .max(50, "attribute name must be 50 characters or less"),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z
    .string()
    .min(1, "description is required")
    .max(500, "description must be 500 characters or less"),
  minRanking: z.number().min(0),
  maxRanking: z.number().min(0),
  increments: z.number().min(0),
  rankIcon: z.string().min(1),
  rankingsRequired: z.number().min(1),
  pictureUrl: z.string().url().nullish(),
  attributes: z.array(GroupAttributeSchema).optional().default([]),
});

export const UpdateGroupSchema = CreateGroupSchema;

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
