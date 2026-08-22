import { describe, it, expect } from "vitest";
import {
  formatGroupResponse,
  formatMemberResponse,
  formatSnobResponse,
  formatAttributeResponse,
  formatItemResponse,
  formatItemAttributeResponse,
  formatRankingResponse,
} from "../mobile-formatters";

describe("mobile-formatters", () => {
  it("formatGroupResponse transforms group record to snake_case API payload", () => {
    const dbGroup = {
      id: "group-1",
      name: "Coffee Snobs",
      description: "Best coffee around",
      minRanking: "1",
      maxRanking: "5",
      increments: "0.5",
      rankIcon: "star",
      rankingsRequired: "2",
      deleted: false,
      pictureUrl: "https://example.com/pic.jpg",
    };

    const formatted = formatGroupResponse(dbGroup);
    expect(formatted).toEqual({
      id: "group-1",
      name: "Coffee Snobs",
      description: "Best coffee around",
      min_ranking: 1,
      max_ranking: 5,
      increments: 0.5,
      rank_icon: "star",
      rankings_required: 2,
      deleted: 0,
      picture_url: "https://example.com/pic.jpg",
    });
  });

  it("formatMemberResponse transforms member record", () => {
    const dbMember = {
      id: "member-1",
      groupId: "group-1",
      snobId: "snob-1",
      role: "ADMIN",
    };

    expect(formatMemberResponse(dbMember)).toEqual({
      id: "member-1",
      group_id: "group-1",
      snob_id: "snob-1",
      role: "ADMIN",
    });
  });

  it("formatSnobResponse transforms snob profile record", () => {
    const dbSnob = {
      id: "snob-1",
      email: "user@example.com",
      firstName: "Jane",
      lastName: "Doe",
      pictureUrl: "https://example.com/avatar.jpg",
      lastGroupId: "group-1",
      isPremium: true,
    };

    expect(formatSnobResponse(dbSnob)).toEqual({
      id: "snob-1",
      email: "user@example.com",
      first_name: "Jane",
      last_name: "Doe",
      picture_url: "https://example.com/avatar.jpg",
      last_group_id: "group-1",
      is_premium: 1,
    });
  });

  it("formatAttributeResponse transforms group attribute record", () => {
    const dbAttribute = {
      id: "attr-1",
      groupId: "group-1",
      name: "Roast Level",
    };

    expect(formatAttributeResponse(dbAttribute)).toEqual({
      id: "attr-1",
      group_id: "group-1",
      name: "Roast Level",
    });
  });

  it("formatItemResponse formats Dates and converts numeric fields correctly", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const dbItem = {
      id: "item-1",
      groupId: "group-1",
      description: "Espresso",
      ranked: true,
      averageRanking: "4.75",
      imageId: "img-1",
      imageUrl: "https://example.com/espresso.jpg",
      createdDate: now,
      updatedDate: now,
      createdBy: "user-1",
      updatedBy: "user-1",
    };

    const formatted = formatItemResponse(dbItem);
    expect(formatted).toEqual({
      id: "item-1",
      group_id: "group-1",
      description: "Espresso",
      ranked: 1,
      average_ranking: 4.75,
      image_id: "img-1",
      image_url: "https://example.com/espresso.jpg",
      created_date: "2026-08-01T12:00:00.000Z",
      updated_date: "2026-08-01T12:00:00.000Z",
      created_by: "user-1",
      updated_by: "user-1",
    });
  });

  it("formatItemAttributeResponse transforms item attribute record", () => {
    const dbItemAttr = {
      id: "ia-1",
      itemId: "item-1",
      attributeId: "attr-1",
      attributeValue: "Dark",
    };

    expect(formatItemAttributeResponse(dbItemAttr)).toEqual({
      id: "ia-1",
      item_id: "item-1",
      attribute_id: "attr-1",
      attribute_value: "Dark",
    });
  });

  it("formatRankingResponse converts string ranking to number and formats date", () => {
    const now = new Date("2026-08-02T10:00:00.000Z");
    const dbRanking = {
      id: "rank-1",
      itemId: "item-1",
      groupMemberId: "member-1",
      ranking: "4.5",
      notes: "Smooth finish",
      createdDate: now,
      updatedDate: now,
    };

    expect(formatRankingResponse(dbRanking)).toEqual({
      id: "rank-1",
      item_id: "item-1",
      group_member_id: "member-1",
      ranking: 4.5,
      notes: "Smooth finish",
      created_date: "2026-08-02T10:00:00.000Z",
      updated_date: "2026-08-02T10:00:00.000Z",
    });
  });
});
