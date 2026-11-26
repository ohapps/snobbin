import { describe, expect, it } from "vitest";
import {
  buildTextPrompt,
  toAiImageUrl,
  cleanAiText,
  describeAttributes,
} from "../identify-item";

const context = {
  groupName: "TV Shows",
  groupDescription: "Shows we watch",
  attributes: [
    { id: "net", name: "Network", existingValues: ["Apple TV+", "HBO"] },
    { id: "genre", name: "Genre", existingValues: [] },
  ],
};

describe("cleanAiText", () => {
  it("removes citation links and domain tags", () => {
    expect(cleanAiText("Stick [apple.com](https://apple.com/tv)")).toBe(
      "Stick",
    );
    expect(cleanAiText("Apple TV+ [apple.com]")).toBe("Apple TV+");
  });

  it("collapses whitespace and limits length", () => {
    expect(cleanAiText("  a\n  b  ")).toBe("a b");
    expect(cleanAiText("x".repeat(150))).toHaveLength(100);
  });
});

describe("prompts", () => {
  it("lists attributes with their existing values", () => {
    const text = describeAttributes(context.attributes);
    expect(text).toContain(
      '- Network (id: "net"): Existing values: ["Apple TV+", "HBO"]',
    );
    expect(text).toContain('- Genre (id: "genre"): No existing values yet.');
  });

  it("quotes what the user typed and steers toward the group's kind of item", () => {
    const prompt = buildTextPrompt(context, 'Stick "owen wilson"');
    expect(prompt).toContain('The user typed: "Stick \\"owen wilson\\""');
    expect(prompt).toContain("prefer the interpretation that fits the group");
    expect(prompt).toContain('Group name: "TV Shows"');
  });
});

describe("toAiImageUrl", () => {
  it("asks Cloudinary for a size-capped JPEG", () => {
    expect(
      toAiImageUrl(
        "http://res.cloudinary.com/demo/image/upload/v1727662676/snobbin/abc.jxl",
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto,w_1600,c_limit/v1727662676/snobbin/abc.jpg",
    );
  });

  it("handles uploads without an extension", () => {
    expect(
      toAiImageUrl("https://res.cloudinary.com/demo/image/upload/v1/abc"),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto,w_1600,c_limit/v1/abc.jpg",
    );
  });

  it("keeps a dot that is part of the public ID", () => {
    expect(
      toAiImageUrl("https://res.cloudinary.com/demo/image/upload/v1/beer.2024"),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto,w_1600,c_limit/v1/beer.2024.jpg",
    );
  });

  it("leaves other URLs alone", () => {
    const wiki = "https://upload.wikimedia.org/wikipedia/en/a/ad/Cover.jpg";
    expect(toAiImageUrl(wiki)).toBe(wiki);
    expect(toAiImageUrl("not a url")).toBe("not a url");
  });
});
