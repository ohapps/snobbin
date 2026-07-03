import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const RequestSchema = z.object({
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

const ResponseSchema = z.object({
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { imageUrl, groupName, groupDescription, attributes } = parsed.data;

    const attributeContext = attributes
      .map((attr) => {
        const existingList =
          attr.existingValues.length > 0
            ? `Existing values: [${attr.existingValues.map((v) => `"${v}"`).join(", ")}]. Prefer selecting from these if the item matches.`
            : "No existing values yet.";
        return `- ${attr.name} (id: "${attr.id}"): ${existingList}`;
      })
      .join("\n");

    const result = await generateObject({
      model: google("gemini-3-flash-preview"),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: new URL(imageUrl) },
            {
              type: "text",
              text: `You are identifying an item for a ranking/review group.

Group name: "${groupName}"
Group description: "${groupDescription}"

Identify the item in this image and provide:
1. A short description (max 100 characters) — this should be the item's specific name or identifying label. IMPORTANT: Do NOT include information in the description that is already captured by one of the attributes below. For example, if "Brewery" is an attribute, the description should be just the beer name without the brewery.
2. Values for each of the following attributes. Use an existing value when the item clearly matches one, otherwise provide an accurate new value.

Attributes:
${attributeContext}

Return the attribute IDs exactly as provided.`,
            },
          ],
        },
      ],
      schema: ResponseSchema,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Error identifying item:", error);
    return NextResponse.json(
      { error: "Failed to identify item" },
      { status: 500 },
    );
  }
}
