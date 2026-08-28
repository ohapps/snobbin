import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

/**
 * Cached JWKS fetcher — jose handles key rotation and caching internally.
 * Only created once per process lifetime.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks && AUTH0_ISSUER_BASE_URL) {
    const jwksUrl = new URL("/.well-known/jwks.json", AUTH0_ISSUER_BASE_URL);
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

/**
 * Extracts the user ID (Auth0 `sub` claim) from a Bearer token in the request.
 *
 * Two modes:
 * 1. Production (AUTH0_ISSUER_BASE_URL set): validates the JWT signature locally
 *    against Auth0's JWKS endpoint. No per-request network call to /userinfo.
 * 2. Development (no AUTH0_ISSUER_BASE_URL): decodes the JWT payload without verification.
 *
 * Returns null if the token is missing, malformed, or fails validation.
 */
export async function getUserIdFromToken(
  request: Request,
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  if (!AUTH0_ISSUER_BASE_URL) {
    // Dev mode: decode the JWT payload without verification
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString(),
      );
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  // Production: verify JWT signature and claims locally
  try {
    const keySet = getJWKS();
    if (!keySet) return null;

    const verifyOptions: { issuer: string; audience?: string } = {
      issuer: `${AUTH0_ISSUER_BASE_URL}/`,
    };

    // Only enforce audience if configured — some Auth0 setups use the
    // Management API audience which may not match a custom API identifier.
    if (AUTH0_AUDIENCE) {
      verifyOptions.audience = AUTH0_AUDIENCE;
    }

    const { payload } = await jwtVerify(token, keySet, verifyOptions);

    return payload.sub || null;
  } catch (err) {
    // Token is expired, malformed, or signature doesn't match
    // Log at debug level — this is expected for expired tokens
    if (process.env.NODE_ENV === "development") {
      console.debug("[auth] JWT verification failed:", (err as Error).message);
    }
    return null;
  }
}
