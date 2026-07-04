import { z } from "zod";

export const IdentifyItemRequestSchema = z.object({
  imageUrl: z.string().url(),
  groupName: z.string(),
  groupDescription: z.string(),
  attributes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      existingValues: z.array(z.string()),
    }),
  ),
});

export type IdentifyItemRequest = z.infer<typeof IdentifyItemRequestSchema>;

export const IdentifyItemResponseSchema = z.object({
  description: z
    .string()
    .max(100)
    .describe("Short name or description of the item identified in the image"),
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
});

export type IdentifyItemResponse = z.infer<typeof IdentifyItemResponseSchema>;
