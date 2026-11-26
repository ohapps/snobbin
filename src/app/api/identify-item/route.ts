import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/utils/user/get-authenticated-user";
import { IdentifyItemRequestSchema, IdentifyItemResponse } from "@/types/ai";
import { uploadUrlToCloudinary } from "@/server/utils/images/upload-url-to-cloudinary";
import { identifyFromImage, identifyFromText } from "@/server/ai/identify-item";
import { findImageCandidates } from "@/server/ai/image-candidates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST { imageUrl? | description?, group context, pickImage? }
 *
 * - With a photo: identifies the item in it.
 * - With text: identifies the item (with a web lookup when configured) and
 *   finds pictures of it. With `pickImage: true` (web app) the pictures come
 *   back as `imageCandidates` for the user to choose from; otherwise (mobile
 *   app, older clients) the first one is copied to Cloudinary and returned as
 *   imageUrl/imagePublicId.
 */
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

    const { imageUrl, description, pickImage, ...context } = parsed.data;

    if (imageUrl) {
      const item = await identifyFromImage(imageUrl, context);
      const response: IdentifyItemResponse = {
        ...item,
        imageUrl: null,
        imagePublicId: null,
      };
      return NextResponse.json(response);
    }

    const item = await identifyFromText(description!.trim(), context);
    const imageCandidates = await findImageCandidates({
      kind: item.kind,
      title: item.description,
      creator: item.creator,
      year: item.year,
      queries: item.imageSearchQueries,
    });

    let uploaded = null;
    if (!pickImage && imageCandidates[0]) {
      uploaded = await uploadUrlToCloudinary(imageCandidates[0].url);
    }

    const response: IdentifyItemResponse = {
      description: item.description,
      attributes: item.attributes,
      imageUrl: uploaded?.url ?? null,
      imagePublicId: uploaded?.publicId ?? null,
      ...(pickImage ? { imageCandidates } : {}),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error identifying item:", error);
    return NextResponse.json(
      { error: "Failed to identify item" },
      { status: 500 },
    );
  }
}
