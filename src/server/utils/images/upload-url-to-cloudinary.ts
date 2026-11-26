import { cloudinary } from "@/config/cloudinary";
import { ItemImage } from "@/types/image";

/**
 * Has Cloudinary fetch a remote image into the snobbin folder, so items keep
 * working (and can be cached offline) even if the source image goes away.
 */
export async function uploadUrlToCloudinary(
  url: string,
): Promise<ItemImage | null> {
  try {
    const uploadRes = await cloudinary.v2.uploader.upload(url, {
      folder: "snobbin",
      resource_type: "image",
      timeout: 20_000,
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
