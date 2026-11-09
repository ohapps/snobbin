/**
 * `crossOrigin` value for an <img> so the service worker can cache it.
 *
 * Cloudinary images are cached by the service worker (see sw.js), which only
 * stores CORS (status 200) responses: a plain no-cors load is opaque, can't
 * satisfy a later CORS request, and is padded to ~7MB against storage quota.
 * Cloudinary sends `Access-Control-Allow-Origin: *`, so CORS is safe there.
 *
 * Other hosts (e.g. social-login profile pictures) may not send CORS headers,
 * and requesting them with CORS would break the image, so they get none.
 */
export function cloudinaryCrossOrigin(
  src: string | null | undefined,
): "anonymous" | undefined {
  if (!src) return undefined;
  try {
    return new URL(src).hostname === "res.cloudinary.com"
      ? "anonymous"
      : undefined;
  } catch {
    return undefined;
  }
}
