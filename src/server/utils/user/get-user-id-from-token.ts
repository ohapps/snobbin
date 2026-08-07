const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;

/**
 * Extracts the user ID (Auth0 `sub` claim) from a Bearer token in the request.
 *
 * Two modes:
 * 1. Production: validates the token against Auth0's userinfo endpoint.
 * 2. Development (no AUTH0_ISSUER_BASE_URL): decodes the JWT payload without verification.
 *
 * Returns null if the token is missing or invalid.
 */
export async function getUserIdFromToken(
  request: Request
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  if (!AUTH0_ISSUER_BASE_URL) {
    // Dev mode: decode the JWT payload without verification
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  const userInfo = await fetch(`${AUTH0_ISSUER_BASE_URL}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!userInfo.ok) return null;

  const info = await userInfo.json();
  return info.sub || null;
}
