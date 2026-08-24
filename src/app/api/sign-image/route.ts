import { NextResponse } from "next/server";
import { cloudinary } from "@/config/cloudinary";
import { getAuthenticatedUser } from "@/server/utils/user/get-authenticated-user";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    paramsToSign: Record<string, string>;
  };
  const { paramsToSign } = body;
  const signature = cloudinary.v2.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string,
  );
  return NextResponse.json({ signature });
}
