import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/utils/user/get-authenticated-user", () => ({
  getAuthenticatedUser: vi.fn(),
}));
vi.mock("@/server/utils/images/upload-url-to-cloudinary", () => ({
  uploadUrlToCloudinary: vi.fn(),
}));
vi.mock("@/server/ai/identify-item", () => ({
  identifyFromImage: vi.fn(),
  identifyFromText: vi.fn(),
}));
vi.mock("@/server/ai/image-candidates", () => ({
  findImageCandidates: vi.fn(),
}));

import { POST } from "../route";
import { getAuthenticatedUser } from "@/server/utils/user/get-authenticated-user";
import { uploadUrlToCloudinary } from "@/server/utils/images/upload-url-to-cloudinary";
import { identifyFromImage, identifyFromText } from "@/server/ai/identify-item";
import { findImageCandidates } from "@/server/ai/image-candidates";

const candidates = [
  {
    url: "https://upload.wikimedia.org/a.jpg",
    thumbnailUrl: "https://upload.wikimedia.org/a-400.jpg",
    source: "wikipedia" as const,
    label: "Stick (TV series)",
  },
  {
    url: "https://image.tmdb.org/t/p/original/b.jpg",
    thumbnailUrl: "https://image.tmdb.org/t/p/w342/b.jpg",
    source: "tmdb" as const,
    label: "Stick · 2025",
  },
];

const post = (body: Record<string, unknown>) =>
  POST(
    new NextRequest("http://localhost/api/identify-item", {
      method: "POST",
      body: JSON.stringify({
        groupName: "TV Shows",
        groupDescription: "Shows",
        attributes: [{ id: "net", name: "Network", existingValues: [] }],
        ...body,
      }),
    }),
  );

describe("POST /api/identify-item", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: "u",
      isPremium: true,
    } as never);
    vi.mocked(identifyFromText).mockResolvedValue({
      description: "Stick",
      kind: "tv",
      year: "2025",
      imageSearchQueries: ["Stick (TV series)"],
      attributes: [{ id: "net", value: "Apple TV+" }],
    });
    vi.mocked(findImageCandidates).mockResolvedValue(candidates);
    vi.mocked(uploadUrlToCloudinary).mockResolvedValue({
      publicId: "snobbin/a",
      url: "https://res.cloudinary.com/a.jpg",
    });
  });

  it("is premium only", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: "u",
      isPremium: false,
    } as never);
    expect((await post({ description: "Stick" })).status).toBe(403);
  });

  it("returns picture choices without uploading when pickImage is set", async () => {
    const res = await post({
      description: "Stick owen wilson",
      pickImage: true,
    });
    expect(await res.json()).toEqual({
      description: "Stick",
      attributes: [{ id: "net", value: "Apple TV+" }],
      imageUrl: null,
      imagePublicId: null,
      imageCandidates: candidates,
    });
    expect(uploadUrlToCloudinary).not.toHaveBeenCalled();
    expect(findImageCandidates).toHaveBeenCalledWith({
      kind: "tv",
      title: "Stick",
      creator: undefined,
      year: "2025",
      queries: ["Stick (TV series)"],
    });
  });

  it("keeps the old behaviour for the mobile app: uploads the first picture", async () => {
    const data = await (await post({ description: "Stick" })).json();
    expect(uploadUrlToCloudinary).toHaveBeenCalledWith(candidates[0].url);
    expect(data.imageUrl).toBe("https://res.cloudinary.com/a.jpg");
    expect(data.imagePublicId).toBe("snobbin/a");
    expect(data).not.toHaveProperty("imageCandidates");
  });

  it("identifies from a photo without searching for pictures", async () => {
    vi.mocked(identifyFromImage).mockResolvedValue({
      description: "Stick",
      attributes: [],
    });
    const data = await (
      await post({
        imageUrl: "https://res.cloudinary.com/p.jpg",
        pickImage: true,
      })
    ).json();
    expect(data.description).toBe("Stick");
    expect(findImageCandidates).not.toHaveBeenCalled();
  });

  it("reports AI failures", async () => {
    vi.mocked(identifyFromText).mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post({ description: "Stick" })).status).toBe(500);
  });
});
