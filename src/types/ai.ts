import { z } from "zod";

export const IdentifyItemRequestSchema = z
  .object({
    imageUrl: z.string().url().optional(),
    description: z.string().optional(),
    groupName: z.string(),
    groupDescription: z.string(),
    attributes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        existingValues: z.array(z.string()),
      }),
    ),
  })
  .refine(
    (data) => !!data.imageUrl || (!!data.description && data.description.trim().length > 0),
    {
      message: "Either imageUrl or description must be provided",
    },
  );

export type IdentifyItemRequest = z.infer<typeof IdentifyItemRequestSchema>;

export const IdentifyItemResponseSchema = z.object({
  description: z
    .string()
    .max(100)
    .describe("Short name or description of the item identified"),
  attributes: z.array(
    z.object({
      id: z.string().describe("The attribute ID from the request"),
      value: z
        .string()
        .describe(
          "The value for this attribute. Prefer an existing value if the item matches, otherwise provide a new one",
        ),
    }),
  ),
  imageUrl: z.string().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
});

export type IdentifyItemResponse = z.infer<typeof IdentifyItemResponseSchema>;

