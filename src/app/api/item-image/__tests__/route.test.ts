import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/utils/user/get-authenticated-user", () => ({
  getAuthenticatedUser: vi.fn(),
}));
vi.mock("@/server/utils/images/upload-url-to-cloudinary", () => ({
  uploadUrlToCloudinary: vi.fn(),
}));

import { POST } from "../route";
import { getAuthenticatedUser } from "@/server/utils/user/get-authenticated-user";
import { uploadUrlToCloudinary } from "@/server/utils/images/upload-url-to-cloudinary";

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/item-image", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/item-image", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "u" } as never);
    vi.mocked(uploadUrlToCloudinary).mockResolvedValue({
      publicId: "snobbin/x",
      url: "https://res.cloudinary.com/x.jpg",
    });
  });

  it("requires sign-in", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect(
      (await post({ url: "https://upload.wikimedia.org/a.jpg" })).status,
    ).toBe(401);
  });

  it("copies a suggested image to Cloudinary", async () => {
    const res = await post({
      url: "https://covers.openlibrary.org/b/id/1-L.jpg",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      publicId: "snobbin/x",
      url: "https://res.cloudinary.com/x.jpg",
    });
  });

  it("refuses images from other hosts", async () => {
    const res = await post({ url: "https://example.com/a.jpg" });
    expect(res.status).toBe(400);
    expect(uploadUrlToCloudinary).not.toHaveBeenCalled();
  });

  it("reports upload failures", async () => {
    vi.mocked(uploadUrlToCloudinary).mockResolvedValue(null);
    expect(
      (await post({ url: "https://upload.wikimedia.org/a.jpg" })).status,
    ).toBe(502);
  });
});
