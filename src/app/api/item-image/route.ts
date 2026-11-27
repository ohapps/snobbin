import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/server/utils/user/get-authenticated-user";
import { uploadUrlToCloudinary } from "@/server/utils/images/upload-url-to-cloudinary";
import { isCandidateImageUrl } from "@/server/ai/image-candidates";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({ url: z.string().url().max(2048) });

/**
 * POST { url } → { publicId, url }: copies a picture the user picked from
 * "Identify with AI" suggestions into Cloudinary. Only accepts images from the
 * sources we suggest (Wikimedia, Open Library, TMDB), so this can't be used to
 * load arbitrary URLs into our Cloudinary account.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const parsed = RequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || !isCandidateImageUrl(parsed.data.url)) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  const image = await uploadUrlToCloudinary(parsed.data.url);
  if (!image) {
    return NextResponse.json(
      { error: "Couldn't save that image" },
      { status: 502 },
    );
  }
  return NextResponse.json(image);
}
