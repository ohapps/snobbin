/**
 * Tests for the IndexedDB mirror: local reads must behave like the server's
 * `getItems()` (src/server/utils/items/get-items.ts), and group sync must keep
 * the mirror equal to the server (full mirror, incremental changes, pruning).
 *
 * Runs the real Dexie code against an in-memory IndexedDB (fake-indexeddb).
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RankingItemSoryBy } from "@/types/rankings";
// `vi.mock` below is hoisted above these imports, so they see the mock.
import { currentDexieDb, resetDexieDb } from "../dexie-db";
import { getLocalItems, getLocalGroupForCurrentUser } from "../repositories";
import { syncGroupDexie } from "../dexie-sync";
import type {
  ApiItem,
  ApiItemAttribute,
  ApiRanking,
  GroupChangesResponse,
  GroupItemsPageResponse,
  GroupMetaResponse,
} from "../api-types";

// A fresh database per test, and a known "me".
let dbName = "test";
vi.mock("../identity", () => ({
  getOfflineDbName: () => dbName,
  getRememberedSnobId: () => "snob-me",
  getRememberedSub: () => "auth0|me",
  setRememberedSnobId: () => {},
}));

const GROUP = "group-1";
const BREWERY = "attr-brewery";
const STYLE = "attr-style";

let counter = 0;
beforeEach(() => {
  dbName = `test-${++counter}`;
});
afterEach(() => {
  resetDexieDb();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ */
/* Local reads                                                         */
/* ------------------------------------------------------------------ */

interface SeedItem {
  id: string;
  description: string;
  createdDate: string;
  averageRanking?: number | null;
  ranked?: boolean;
  attrs?: Record<string, string>;
}

async function seed(items: SeedItem[]) {
  const db = currentDexieDb();
  await db.groups.put({
    id: GROUP,
    name: "Beer Snobs",
    description: null,
    minRanking: 1,
    maxRanking: 5,
    increments: 0.5,
    rankIcon: null,
    rankingsRequired: 1,
    deleted: false,
    pictureUrl: null,
  } as never);
  await db.snobs.put({
    id: "snob-me",
    email: "me@example.com",
    firstName: "Me",
    lastName: "Snob",
    pictureUrl: null,
    lastGroupId: GROUP,
    isPremium: false,
  } as never);
  await db.group_members.put({
    id: "member-me",
    groupId: GROUP,
    snobId: "snob-me",
    role: "ADMIN",
  } as never);
  await db.group_attributes.bulkPut([
    { id: STYLE, groupId: GROUP, name: "Style" },
    { id: BREWERY, groupId: GROUP, name: "Brewery" },
  ] as never);
  await db.group_invites.put({
    id: "invite-1",
    groupId: GROUP,
    email: "friend@example.com",
    status: "PENDING",
  } as never);
  for (const item of items) {
    await db.items.put({
      id: item.id,
      groupId: GROUP,
      description: item.description,
      ranked: item.ranked ?? false,
      averageRanking: item.averageRanking ?? null,
      imageId: null,
      imageUrl: null,
      createdDate: item.createdDate,
      updatedDate: item.createdDate,
      createdBy: "snob-me",
      updatedBy: "snob-me",
    } as never);
    for (const [attributeId, attributeValue] of Object.entries(
      item.attrs ?? {},
    )) {
      await db.item_attributes.put({
        id: `${item.id}-${attributeId}`,
        itemId: item.id,
        attributeId,
        attributeValue,
      } as never);
    }
  }
}

const day = (n: number) => `2026-01-${String(n).padStart(2, "0")}T00:00:00Z`;

const SAMPLE: SeedItem[] = [
  {
    id: "a",
    description: "Pilsner",
    createdDate: day(1),
    averageRanking: 3,
    ranked: true,
    attrs: { [BREWERY]: "Side Project", [STYLE]: "Lager" },
  },
  {
    id: "b",
    description: "Hazy IPA",
    createdDate: day(3),
    averageRanking: 4.5,
    ranked: true,
    attrs: { [BREWERY]: "2nd Shift Brewery", [STYLE]: "IPA" },
  },
  {
    id: "c",
    description: "Nut Brown Ale",
    createdDate: day(2),
    averageRanking: null,
    ranked: false,
    attrs: { [BREWERY]: "Samuel Smith", [STYLE]: "Brown Ale" },
  },
  // Same created date as "c": the id breaks the tie, like the server.
  {
    id: "d",
    description: "Festbier",
    createdDate: day(2),
    averageRanking: 3.5,
    ranked: true,
  },
];

const ids = (res: { items: { id?: string }[] }) => res.items.map((i) => i.id);

describe("getLocalItems (parity with server getItems)", () => {
  beforeEach(() => seed(SAMPLE));

  it("defaults to most recent first, id as tiebreaker", async () => {
    const res = await getLocalItems({ groupId: GROUP, page: 1 });
    expect(ids(res)).toEqual(["b", "c", "d", "a"]);
    expect(res.total).toBe(4);
  });

  it("sorts by description", async () => {
    const res = await getLocalItems({
      groupId: GROUP,
      page: 1,
      sortBy: RankingItemSoryBy.DESCRIPTION,
    });
    expect(ids(res)).toEqual(["d", "b", "c", "a"]);
  });

  it("sorts by average ranking, highest first, unranked last", async () => {
    const res = await getLocalItems({
      groupId: GROUP,
      page: 1,
      sortBy: RankingItemSoryBy.RANKING,
    });
    expect(ids(res)).toEqual(["b", "d", "a", "c"]);
  });

  it('treats the UI\'s "pending" status as unranked', async () => {
    const pending = await getLocalItems({
      groupId: GROUP,
      page: 1,
      status: "pending",
    });
    expect(ids(pending)).toEqual(["c"]);

    const ranked = await getLocalItems({
      groupId: GROUP,
      page: 1,
      status: "ranked",
    });
    expect(ids(ranked)).toEqual(["b", "d", "a"]);
  });

  it("matches keyword against description or any attribute value", async () => {
    const byDescription = await getLocalItems({
      groupId: GROUP,
      page: 1,
      keyword: "hazy",
    });
    expect(ids(byDescription)).toEqual(["b"]);

    const byAttribute = await getLocalItems({
      groupId: GROUP,
      page: 1,
      keyword: "samuel",
    });
    expect(ids(byAttribute)).toEqual(["c"]);
  });

  it("applies attribute filters as exact matches, ignoring 'all'", async () => {
    const res = await getLocalItems({
      groupId: GROUP,
      page: 1,
      attributeFilters: { [STYLE]: "IPA", [BREWERY]: "all" },
    });
    expect(ids(res)).toEqual(["b"]);

    const partial = await getLocalItems({
      groupId: GROUP,
      page: 1,
      attributeFilters: { [STYLE]: "IP" },
    });
    expect(ids(partial)).toEqual([]);
  });

  it("returns item attributes keyed by attribute id", async () => {
    const res = await getLocalItems({ groupId: GROUP, page: 1 });
    const hazy = res.items.find((i) => i.id === "b")!;
    expect(hazy.attributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attributeId: BREWERY,
          attributeValue: "2nd Shift Brewery",
        }),
        expect.objectContaining({ attributeId: STYLE, attributeValue: "IPA" }),
      ]),
    );
  });
});

describe("getLocalItems paging", () => {
  it("pages 20 at a time", async () => {
    await seed(
      Array.from({ length: 45 }, (_, i) => ({
        id: `item-${String(i).padStart(2, "0")}`,
        description: `Beer ${i}`,
        createdDate: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      })),
    );
    const page1 = await getLocalItems({ groupId: GROUP, page: 1 });
    const page3 = await getLocalItems({ groupId: GROUP, page: 3 });
    expect(page1.total).toBe(45);
    expect(page1.items).toHaveLength(20);
    expect(page1.items[0].id).toBe("item-44");
    expect(page3.items).toHaveLength(5);
    expect(page3.items.at(-1)!.id).toBe("item-00");
  });
});

describe("getLocalGroupForCurrentUser", () => {
  it("includes members, attributes, and invites", async () => {
    await seed(SAMPLE);
    const group = await getLocalGroupForCurrentUser(GROUP);
    expect(group?.members).toHaveLength(1);
    expect(group?.attributes.map((a) => a.name)).toEqual(["Brewery", "Style"]);
    expect(group?.invites).toEqual([
      expect.objectContaining({
        email: "friend@example.com",
        groupName: "Beer Snobs",
      }),
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* Group sync                                                          */
/* ------------------------------------------------------------------ */

function apiItem(id: string, updated = day(1)): ApiItem {
  return {
    id,
    group_id: GROUP,
    description: `Beer ${id}`,
    ranked: 1,
    average_ranking: 4,
    image_id: null,
    image_url: null,
    created_date: day(1),
    updated_date: updated,
    created_by: "snob-me",
    updated_by: "snob-me",
  } as ApiItem;
}

function apiAttr(itemId: string, attributeId: string, value: string) {
  return {
    id: `${itemId}-${attributeId}`,
    item_id: itemId,
    attribute_id: attributeId,
    attribute_value: value,
  } as ApiItemAttribute;
}

function apiRanking(id: string, itemId: string, ranking: number): ApiRanking {
  return {
    id,
    item_id: itemId,
    group_member_id: "member-me",
    ranking,
    notes: null,
    created_date: day(1),
    updated_date: day(1),
  } as ApiRanking;
}

function meta(attributeIds = [BREWERY, STYLE]): GroupMetaResponse {
  return {
    group: {
      id: GROUP,
      name: "Beer Snobs",
      description: null,
      min_ranking: 1,
      max_ranking: 5,
      increments: 0.5,
      rank_icon: null,
      rankings_required: 1,
      deleted: 0,
      picture_url: null,
    },
    members: [
      { id: "member-me", group_id: GROUP, snob_id: "snob-me", role: "ADMIN" },
    ],
    snobs: [],
    attributes: attributeIds.map((id) => ({ id, group_id: GROUP, name: id })),
    invites: [],
    totalItems: 0,
    serverTime: "2026-02-01T00:00:00.000Z",
  } as unknown as GroupMetaResponse;
}

interface FakeServer {
  meta: GroupMetaResponse;
  pages: Omit<GroupItemsPageResponse, "page" | "pageSize">[];
  changes?: GroupChangesResponse;
}

/** Stubs `fetch` for the /api/offline group routes; records requested URLs. */
function serve(server: FakeServer) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    const json = (body: unknown) =>
      ({ ok: true, status: 200, json: async () => body }) as Response;
    if (url.includes("/meta")) return json(server.meta);
    if (url.includes("/changes")) return json(server.changes);
    const page = Number(new URL(url, "http://x").searchParams.get("page"));
    return json({ ...server.pages[page - 1], page, pageSize: 20 });
  });
  return calls;
}

async function mirror() {
  const db = currentDexieDb();
  const items = await db.items.where("groupId").equals(GROUP).toArray();
  const itemIds = items.map((i) => i.id).sort();
  const attrs = await db.item_attributes.toArray();
  const rankings = await db.rankings.toArray();
  const syncMeta = await db.sync_meta.get(GROUP);
  return { itemIds, attrs, rankings, syncMeta };
}

describe("syncGroupDexie", () => {
  it("full mirror stores every page and records a change cursor", async () => {
    serve({
      meta: meta(),
      pages: [
        {
          items: [apiItem("x"), apiItem("y")],
          itemAttributes: [apiAttr("x", BREWERY, "Side Project")],
          rankings: [apiRanking("r1", "x", 4)],
          total: 3,
          complete: false,
        },
        {
          items: [apiItem("z")],
          itemAttributes: [],
          rankings: [],
          total: 3,
          complete: true,
        },
      ],
    });

    await syncGroupDexie(GROUP);

    const m = await mirror();
    expect(m.itemIds).toEqual(["x", "y", "z"]);
    expect(m.attrs).toHaveLength(1);
    expect(m.rankings).toHaveLength(1);
    expect(m.syncMeta).toMatchObject({ complete: true, totalItems: 3 });
    expect(JSON.parse(m.syncMeta!.state!)).toEqual({
      changesCursor: "2026-02-01T00:00:00.000Z",
    });
  });

  it("full mirror prunes items deleted on the server", async () => {
    await seed([{ id: "gone", description: "Old", createdDate: day(1) }]);
    serve({
      meta: meta(),
      pages: [
        {
          items: [apiItem("x")],
          itemAttributes: [],
          rankings: [],
          total: 1,
          complete: true,
        },
      ],
    });

    await syncGroupDexie(GROUP);
    expect((await mirror()).itemIds).toEqual(["x"]);
  });

  async function fullyMirrored() {
    serve({
      meta: meta(),
      pages: [
        {
          items: [apiItem("x"), apiItem("y")],
          itemAttributes: [
            apiAttr("x", BREWERY, "Side Project"),
            apiAttr("x", STYLE, "Lager"),
          ],
          rankings: [apiRanking("r1", "x", 3), apiRanking("r2", "x", 5)],
          total: 2,
          complete: true,
        },
      ],
    });
    await syncGroupDexie(GROUP);
  }

  it("applies incremental changes: upserts, replaces rankings, prunes deletes", async () => {
    await fullyMirrored();
    const calls = serve({
      meta: meta(),
      pages: [],
      changes: {
        tooMany: false,
        cursor: "2026-03-01T00:00:00.000Z",
        // "x" changed: one ranking removed, one updated. "y" deleted. "n" new.
        items: [apiItem("x", day(20)), apiItem("n", day(20))],
        itemAttributes: [apiAttr("x", BREWERY, "Side Project")],
        rankings: [apiRanking("r2", "x", 4)],
        itemIds: ["x", "n"],
      },
    });

    await syncGroupDexie(GROUP);

    expect(calls.some((u) => u.includes("/items"))).toBe(false);
    const changesCall = calls.find((u) => u.includes("/changes"))!;
    // Asks from slightly before the stored cursor, to absorb clock skew.
    const since = new URL(changesCall, "http://x").searchParams.get("since")!;
    expect(Date.parse(since)).toBeLessThan(Date.parse("2026-02-01T00:00:00Z"));

    const m = await mirror();
    expect(m.itemIds).toEqual(["n", "x"]);
    expect(m.rankings.map((r) => [r.id, r.ranking])).toEqual([["r2", 4]]);
    expect(m.attrs.map((a) => a.attributeId)).toEqual([BREWERY]);
    expect(m.syncMeta).toMatchObject({ complete: true, totalItems: 2 });
    expect(JSON.parse(m.syncMeta!.state!).changesCursor).toBe(
      "2026-03-01T00:00:00.000Z",
    );
  });

  it("falls back to a full mirror when the delta is too large", async () => {
    await fullyMirrored();
    const calls = serve({
      meta: meta(),
      pages: [
        {
          items: [apiItem("only")],
          itemAttributes: [],
          rankings: [],
          total: 1,
          complete: true,
        },
      ],
      changes: { tooMany: true, cursor: "2026-03-01T00:00:00.000Z" },
    });

    await syncGroupDexie(GROUP);

    expect(calls.some((u) => u.includes("/items"))).toBe(true);
    expect((await mirror()).itemIds).toEqual(["only"]);
  });

  it("drops item values for a deleted group attribute", async () => {
    await fullyMirrored();
    serve({
      meta: meta([BREWERY]), // "Style" was deleted from the group
      pages: [],
      changes: {
        tooMany: false,
        cursor: "2026-03-01T00:00:00.000Z",
        items: [],
        itemAttributes: [],
        rankings: [],
        itemIds: ["x", "y"],
      },
    });

    await syncGroupDexie(GROUP);

    const m = await mirror();
    expect(m.attrs.map((a) => a.attributeId)).toEqual([BREWERY]);
    const attrs = await currentDexieDb()
      .group_attributes.where("groupId")
      .equals(GROUP)
      .toArray();
    expect(attrs.map((a) => a.id)).toEqual([BREWERY]);
  });
});
