import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromToken } from "@/server/utils/user/get-user-id-from-token";
import {
  getActiveMembership,
  GroupMembership,
} from "@/server/utils/group/get-active-membership";

// ─── Result Types ────────────────────────────────────────────────────────────

interface AuthSuccess {
  ok: true;
  userId: string;
}

interface MemberSuccess {
  ok: true;
  userId: string;
  membership: GroupMembership;
}

interface ParseSuccess<T> {
  ok: true;
  data: T;
}

interface GuardFailure {
  ok: false;
  response: NextResponse;
}

export type AuthResult = AuthSuccess | GuardFailure;
export type MemberResult = MemberSuccess | GuardFailure;
export type AdminResult = MemberSuccess | GuardFailure;
export type ParseResult<T> = ParseSuccess<T> | GuardFailure;

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * Requires a valid authenticated user.
 * Returns the userId on success, or a 401 response on failure.
 *
 * @example
 * ```ts
 * const auth = await requireAuth(request);
 * if (!auth.ok) return auth.response;
 * // auth.userId is available
 * ```
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authorization required" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, userId };
}

/**
 * Requires the user to be an active (non-DISABLED) member of the group.
 * Returns the userId and membership on success, or a 401/403 response on failure.
 *
 * @example
 * ```ts
 * const auth = await requireMember(request, groupId);
 * if (!auth.ok) return auth.response;
 * // auth.userId, auth.membership.id, auth.membership.role
 * ```
 */
export async function requireMember(
  request: Request,
  groupId: string,
): Promise<MemberResult> {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult;

  const membership = await getActiveMembership(groupId, authResult.userId);
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: authResult.userId, membership };
}

/**
 * Requires the user to be an ADMIN of the group.
 * Returns the userId and membership on success, or a 401/403 response on failure.
 *
 * @example
 * ```ts
 * const auth = await requireAdmin(request, groupId);
 * if (!auth.ok) return auth.response;
 * // auth.userId, auth.membership
 * ```
 */
export async function requireAdmin(
  request: Request,
  groupId: string,
): Promise<AdminResult> {
  const memberResult = await requireMember(request, groupId);
  if (!memberResult.ok) return memberResult;

  if (memberResult.membership.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only group admins can perform this action" },
        { status: 403 },
      ),
    };
  }

  return memberResult;
}

// ─── Request Body Parsing ────────────────────────────────────────────────────

/**
 * Parses and validates the request body against a Zod schema.
 * Returns the validated data on success, or a 400 response on failure.
 *
 * Handles both invalid JSON and schema validation errors.
 *
 * @example
 * ```ts
 * const body = await parseBody(request, CreateGroupSchema);
 * if (!body.ok) return body.response;
 * // body.data is fully typed from the schema
 * ```
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
