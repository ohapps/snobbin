import { describe, it, expect } from "vitest";
import {
  CreateItemSchema,
  UpdateItemSchema,
  PostRankingSchema,
} from "../mobile-schemas";

describe("mobile-schemas", () => {
  describe("CreateItemSchema", () => {
    it("validates a valid payload", () => {
      const payload = {
        groupId: "group-123",
        description: "Delicious Pizza",
        imageId: "img-1",
        imageUrl: "https://example.com/pizza.png",
        attributes: [
          { attributeId: "attr-1", attributeValue: "Spicy" },
        ],
      };

      const result = CreateItemSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(payload);
      }
    });

    it("defaults attributes to empty array if omitted", () => {
      const payload = {
        groupId: "group-123",
        description: "Coffee",
      };

      const result = CreateItemSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attributes).toEqual([]);
      }
    });

    it("fails when groupId or description is missing", () => {
      const missingGroupId = { description: "Item description" };
      const missingDesc = { groupId: "group-123" };

      expect(CreateItemSchema.safeParse(missingGroupId).success).toBe(false);
      expect(CreateItemSchema.safeParse(missingDesc).success).toBe(false);
    });

    it("fails when attribute item is missing attributeId", () => {
      const invalidAttr = {
        groupId: "group-123",
        description: "Test Item",
        attributes: [{ attributeId: "", attributeValue: "Val" }],
      };

      expect(CreateItemSchema.safeParse(invalidAttr).success).toBe(false);
    });
  });

  describe("UpdateItemSchema", () => {
    it("validates a valid update payload", () => {
      const payload = {
        description: "Updated description",
        imageId: null,
        imageUrl: null,
        attributes: [],
      };

      const result = UpdateItemSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("fails when description is empty", () => {
      const payload = { description: "" };
      expect(UpdateItemSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe("PostRankingSchema", () => {
    it("validates a valid ranking creation payload", () => {
      const payload = {
        itemId: "item-123",
        groupMemberId: "member-456",
        ranking: 4.5,
        notes: "Great taste",
      };

      const result = PostRankingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("validates a valid ranking update payload with id", () => {
      const payload = {
        id: "ranking-789",
        itemId: "item-123",
        groupMemberId: "member-456",
        ranking: 5,
      };

      const result = PostRankingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("fails when ranking is not a number", () => {
      const payload = {
        itemId: "item-123",
        groupMemberId: "member-456",
        ranking: "five",
      };

      expect(PostRankingSchema.safeParse(payload).success).toBe(false);
    });

    it("fails when required fields are missing", () => {
      expect(PostRankingSchema.safeParse({ itemId: "item-123" }).success).toBe(false);
    });
  });
});
