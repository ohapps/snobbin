import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/utils/user/get-authenticated-user";
import {
  IdentifyItemRequestSchema,
  IdentifyItemResponseSchema,
} from "@/types/ai";
import { cloudinary } from "@/config/cloudinary";
import { z } from "zod";

/**
 * Searches Wikipedia & Wikimedia Commons for a public image of an item/entity.
 */
async function findPublicImage(query: string): Promise<string | null> {
  try {
    // 1. Try Wikipedia Page Summary API
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { "User-Agent": "SnobbinApp/1.0 (contact@snobbin.com)" },
    });

    if (summaryRes.ok) {
      const summaryData = await summaryRes.json();
      if (summaryData.thumbnail?.source) {
        // Upgrade thumbnail size if possible (e.g. replace 320px with 800px or use original)
        if (summaryData.originalimage?.source) {
          return summaryData.originalimage.source;
        }
        return summaryData.thumbnail.source;
      }
    }

    // 2. Try Wikimedia Commons search API
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query,
    )}&gsrlimit=1&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "SnobbinApp/1.0 (contact@snobbin.com)" },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = searchData.query?.pages;
      if (pages) {
        const firstPageId = Object.keys(pages)[0];
        const imageInfo = pages[firstPageId]?.imageinfo?.[0];
        if (imageInfo?.url) {
          return imageInfo.url;
        }
      }
    }
  } catch (err) {
    console.warn("Failed to find public image:", err);
  }
  return null;
}

/**
 * Uploads an image URL to Cloudinary in the snobbin folder.
 */
async function uploadUrlToCloudinary(
  url: string,
): Promise<{ publicId: string; url: string } | null> {
  try {
    const uploadRes = await cloudinary.v2.uploader.upload(url, {
      folder: "snobbin",
    });
    return {
      publicId: uploadRes.public_id,
      url: uploadRes.secure_url,
    };
  } catch (err) {
    console.error("Cloudinary upload failed for URL:", url, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!user.isPremium) {
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

    const { imageUrl, description, groupName, groupDescription, attributes } =
      parsed.data;

    const attributeContext = attributes
      .map((attr) => {
        const existingList =
          attr.existingValues.length > 0
            ? `Existing values: [${attr.existingValues.map((v) => `"${v}"`).join(", ")}]. Prefer selecting from these if the item matches.`
            : "No existing values yet.";
        return `- ${attr.name} (id: "${attr.id}"): ${existingList}`;
      })
      .join("\n");

    if (imageUrl) {
      // Flow 1: Image provided -> identify description and attributes from the image
      const result = await generateObject({
        model: google("gemini-3.7-flash"),
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

      return NextResponse.json({
        ...result.object,
        imageUrl: null,
        imagePublicId: null,
      });
    }

    // Flow 2: Description provided -> identify attributes and search term for finding an image
    const textPromptSchema = z.object({
      description: z
        .string()
        .max(100)
        .describe(
          "Refined/cleaned specific name or title of the item (e.g. 'Ted Lasso', 'Heineken Original')",
        ),
      imageSearchQuery: z
        .string()
        .describe(
          "The best concise Wikipedia / Wikimedia search query to find an image or poster/logo/photo of this item (e.g. 'Ted Lasso (TV series)', 'Heineken')",
        ),
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

    const result = await generateObject({
      model: google("gemini-3.7-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are identifying an item for a ranking/review group based on a user's description.

Group name: "${groupName}"
Group description: "${groupDescription}"
User provided item description/query: "${description}"

Please provide:
1. A clean, accurate short description (max 100 characters) — the specific item name or label. IMPORTANT: Do NOT include information in the description that is already captured by one of the attributes below.
2. An optimal imageSearchQuery (such as the Wikipedia article title or specific entity name) to find a high-quality picture/poster/logo of this item.
3. Accurate values for each of the following attributes. Use an existing value when the item clearly matches one, otherwise provide an accurate new value.

Attributes:
${attributeContext}

Return the attribute IDs exactly as provided.`,
            },
          ],
        },
      ],
      schema: textPromptSchema,
    });

    const data = result.object;

    // Search for a public image using the query or cleaned description
    let uploadedImage: { publicId: string; url: string } | null = null;
    const foundImageUrl =
      (await findPublicImage(data.imageSearchQuery)) ||
      (await findPublicImage(data.description));

    if (foundImageUrl) {
      uploadedImage = await uploadUrlToCloudinary(foundImageUrl);
    }

    return NextResponse.json({
      description: data.description,
      attributes: data.attributes,
      imageUrl: uploadedImage?.url ?? null,
      imagePublicId: uploadedImage?.publicId ?? null,
    });
  } catch (error) {
    console.error("Error identifying item:", error);
    return NextResponse.json(
      { error: "Failed to identify item" },
      { status: 500 },
    );
  }
}
