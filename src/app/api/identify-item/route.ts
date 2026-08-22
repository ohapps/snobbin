import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { db } from "@/server/db";
import { snobsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import { getUserFromSession } from "@/server/utils/user/get-user-from-session";
import {
  IdentifyItemRequestSchema,
  IdentifyItemResponseSchema,
} from "@/types/ai";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via mobile Bearer token or web session
    let isPremiumUser = false;
    let isAuthenticated = false;

    const tokenUserId = await getUserIdFromToken(request);
    if (tokenUserId) {
      const snobs = await db
        .select()
        .from(snobsTable)
        .where(eq(snobsTable.id, tokenUserId));
      if (snobs.length > 0) {
        isAuthenticated = true;
        isPremiumUser = !!snobs[0].isPremium;
      }
    }

    if (!isAuthenticated) {
      const session = await getSession();
      if (session) {
        const snob = await getUserFromSession(session);
        if (snob) {
          isAuthenticated = true;
          isPremiumUser = !!snob.isPremium;
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!isPremiumUser) {
      return NextResponse.json(
        { error: "AI item detection is only available to premium users" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = IdentifyItemRequestSchema.safeParse(body);

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
      model: google("gemini-3.5-flash"),
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
      schema: IdentifyItemResponseSchema,
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
