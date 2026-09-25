import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { getSession } from "@auth0/nextjs-auth0";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import { SnobGroupRole } from "@/types/snobGroup";

vi.mock("@auth0/nextjs-auth0", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/server/utils/group/get-active-membership", () => ({
  getActiveMembership: vi.fn(),
}));

vi.mock("@/server/utils/api/route-guards", () => ({
  requireMember: vi.fn(),
}));

describe("GET /api/groups/[groupId]/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if web user has no session", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/groups/group-1/events");
    const response = await GET(request, { params: { groupId: "group-1" } });

    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not a member of the group", async () => {
    vi.mocked(getSession).mockResolvedValueOnce({
      user: { sub: "user-1" },
    } as never);
    vi.mocked(getActiveMembership).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/groups/group-1/events");
    const response = await GET(request, { params: { groupId: "group-1" } });

    expect(response.status).toBe(403);
  });

  it("returns 200 with text/event-stream headers when user is an active member", async () => {
    vi.mocked(getSession).mockResolvedValueOnce({
      user: { sub: "user-1" },
    } as never);
    vi.mocked(getActiveMembership).mockResolvedValueOnce({
      id: "membership-1",
      role: SnobGroupRole.MEMBER,
    });

    const request = new Request("http://localhost:3000/api/groups/group-1/events");
    const response = await GET(request, { params: { groupId: "group-1" } });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("Cache-Control")).toContain("no-cache");
  });
});
