/**
 * Pre-caches item thumbnails so they render offline.
 *
 * The service worker caches Cloudinary responses CacheFirst, but only for
 * images the browser actually requested. Thumbnails are lazy-loaded, so items
 * never scrolled into view would show a broken image offline. After a group is
 * mirrored we request each thumbnail once through the service worker, which
 * stores it (already-cached URLs are answered from cache without a network hit).
 *
 * URLs must match what `ImagePreview` renders byte for byte, since the cache is
 * keyed by URL: a 200px `CldImage` is served by next/image as w_256 (1x) and
 * w_640 (2x), and the browser picks one by device pixel ratio.
 */

import { getCldImageUrl } from "next-cloudinary";
import { currentDexieDb } from "./dexie-db";
import { placeholderImage } from "@/types/image";

const CONCURRENCY = 6;

/** Matches the srcset candidate the browser picks for a 200px thumbnail. */
function thumbnailWidth(): number {
  return typeof window !== "undefined" && window.devicePixelRatio > 1
    ? 640
    : 256;
}

export function thumbnailUrl(publicId: string, width = thumbnailWidth()) {
  return getCldImageUrl({ src: publicId, width, height: width, crop: "fill" });
}

export async function warmGroupImages(
  groupId: string,
  signal?: AbortSignal,
): Promise<void> {
  // Without a controlling worker nothing would be cached, so don't download.
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller)
    return;

  const items = await currentDexieDb()
    .items.where("groupId")
    .equals(groupId)
    .toArray();

  const publicIds = new Set<string>();
  let needsPlaceholder = false;
  for (const item of items) {
    if (item.imageId && item.imageUrl) publicIds.add(item.imageId);
    else needsPlaceholder = true;
  }
  if (needsPlaceholder) publicIds.add(placeholderImage.publicId);

  const width = thumbnailWidth();
  const queue = Array.from(publicIds, (id) => thumbnailUrl(id, width));

  const worker = async () => {
    while (queue.length > 0 && !signal?.aborted) {
      const url = queue.shift()!;
      try {
        // CORS (not no-cors) so the cache holds a real-sized response instead
        // of an opaque one, which Chrome pads to ~7MB each against quota.
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        await res.body?.cancel();
      } catch {
        // Missing/deleted image or a network blip: skip it.
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}
