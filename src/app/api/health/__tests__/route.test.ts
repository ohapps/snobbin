import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { db } from "@/server/db";

vi.mock("@/server/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and ok status when database check succeeds", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({} as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.database.status).toBe("connected");
    expect(typeof data.uptime).toBe("number");
    expect(typeof data.timestamp).toBe("string");
    expect(typeof data.database.responseTimeMs).toBe("number");
  });

  it("returns 503 and error status when database check fails", async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error("DB connection timeout"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("error");
    expect(data.database.status).toBe("disconnected");
    expect(data.database.error).toBe("DB connection timeout");
    expect(typeof data.uptime).toBe("number");
    expect(typeof data.timestamp).toBe("string");
  });
});
