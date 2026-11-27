import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findImageCandidates,
  isCandidateImageUrl,
  isRelevant,
  previewOf,
  significantWords,
  searchCommons,
  searchOpenLibrary,
  searchTmdb,
  searchWikipedia,
} from "../image-candidates";

/** Fake fetch that answers by URL prefix and records what was asked. */
const fakeFetch = (routes: Record<string, unknown>) => {
  const calls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    if (!match) return new Response("not found", { status: 404 });
    const body = routes[match];
    if (body instanceof Error) throw body;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
};

const WIKI = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const OPENLIBRARY = "https://openlibrary.org/search.json";
const TMDB = "https://api.themoviedb.org/3/search/";

const wikiPages = {
  query: {
    pages: [
      {
        title: "Stick (disambiguation)",
        index: 1,
        pageprops: { disambiguation: "" },
        original: { source: "https://upload.wikimedia.org/x/disambig.jpg" },
      },
      {
        title: "Stick (TV series)",
        index: 2,
        original: { source: "https://upload.wikimedia.org/x/stick.jpg" },
        thumbnail: {
          source:
            "https://thumb.wikimedia.org/x/thumb/stick.jpg/1920px-stick.jpg",
        },
      },
      { title: "Stick figure", index: 3 },
    ],
  },
};

describe("searchWikipedia", () => {
  it("skips disambiguation pages and pages without images", async () => {
    const { impl, calls } = fakeFetch({ [WIKI]: wikiPages });
    expect(await searchWikipedia("Stick", 3, impl)).toEqual([
      {
        // The ~1600px rendition, not the (possibly huge) original.
        url: "https://thumb.wikimedia.org/x/thumb/stick.jpg/1920px-stick.jpg",
        thumbnailUrl:
          "https://thumb.wikimedia.org/x/thumb/stick.jpg/500px-stick.jpg",
        source: "wikipedia",
        label: "Stick (TV series)",
      },
    ]);
    expect(calls[0]).toContain("gsrsearch=Stick");
    expect(calls[0]).toContain("pithumbsize=1600");
    // Posters/covers aren't freely licensed; without this they're missing.
    expect(calls[0]).toContain("pilicense=any");
  });

  it("uses the original when Wikipedia has no rendition", async () => {
    const { impl } = fakeFetch({
      [WIKI]: {
        query: {
          pages: [
            {
              title: "Small poster",
              index: 1,
              original: { source: "https://upload.wikimedia.org/x/small.jpg" },
            },
          ],
        },
      },
    });
    const [candidate] = await searchWikipedia("Small poster", 3, impl);
    expect(candidate.url).toBe("https://upload.wikimedia.org/x/small.jpg");
    expect(candidate.thumbnailUrl).toBe(candidate.url);
  });

  it("returns nothing when the request fails", async () => {
    const { impl } = fakeFetch({ [WIKI]: new Error("network down") });
    expect(await searchWikipedia("Stick", 3, impl)).toEqual([]);
  });
});

describe("searchCommons", () => {
  it("keeps only photos (no SVG/PDF) and strips the File: prefix", async () => {
    const { impl } = fakeFetch({
      [COMMONS]: {
        query: {
          pages: [
            {
              title: "File:Two Hearted Ale bottle.jpg",
              index: 1,
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/c/bottle.jpg",
                  thumburl: "https://upload.wikimedia.org/c/400px-bottle.jpg",
                  mime: "image/jpeg",
                },
              ],
            },
            {
              title: "File:Logo.svg",
              index: 2,
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/c/logo.svg",
                  mime: "image/svg+xml",
                },
              ],
            },
          ],
        },
      },
    });
    const result = await searchCommons("Two Hearted Ale", 3, impl);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Two Hearted Ale bottle");
  });
});

describe("searchOpenLibrary", () => {
  it("builds cover URLs and skips duplicates and books without covers", async () => {
    const { impl, calls } = fakeFetch({
      [OPENLIBRARY]: {
        docs: [
          {
            title: "Project Hail Mary",
            author_name: ["Andy Weir"],
            cover_i: 101,
          },
          {
            title: "Project Hail Mary",
            author_name: ["Andy Weir"],
            cover_i: 101,
          },
          { title: "Project Hail Mary (Spanish)" },
          { title: "Project Hail Mary", cover_i: 102 },
        ],
      },
    });
    const result = await searchOpenLibrary(
      "Project Hail Mary",
      "Andy Weir",
      3,
      impl,
    );
    expect(result.map((c) => c.url)).toEqual([
      "https://covers.openlibrary.org/b/id/101-L.jpg",
      "https://covers.openlibrary.org/b/id/102-L.jpg",
    ]);
    expect(result[0].label).toBe("Project Hail Mary · Andy Weir");
    expect(calls[0]).toContain("author=Andy+Weir");
  });
});

describe("searchTmdb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is skipped without a key", async () => {
    vi.stubEnv("TMDB_API_KEY", "");
    const { impl } = fakeFetch({});
    expect(await searchTmdb("Stick", "tv", "2025", 3, impl)).toEqual([]);
    expect(impl).not.toHaveBeenCalled();
  });

  it("uses a v3 key as a query param and filters by year", async () => {
    vi.stubEnv("TMDB_API_KEY", "abc123");
    const { impl, calls } = fakeFetch({
      [TMDB]: {
        results: [
          {
            name: "Stick",
            first_air_date: "2025-06-04",
            poster_path: "/stick.jpg",
          },
          { name: "No poster", poster_path: null },
        ],
      },
    });
    const result = await searchTmdb("Stick", "tv", "2025", 3, impl);
    expect(calls[0]).toContain("/search/tv?");
    expect(calls[0]).toContain("api_key=abc123");
    expect(calls[0]).toContain("first_air_date_year=2025");
    expect(result).toEqual([
      {
        url: "https://image.tmdb.org/t/p/original/stick.jpg",
        thumbnailUrl: "https://image.tmdb.org/t/p/w342/stick.jpg",
        source: "tmdb",
        label: "Stick · 2025",
      },
    ]);
  });

  it("sends a v4 read token as a bearer header", async () => {
    vi.stubEnv("TMDB_API_KEY", "x".repeat(60));
    const impl = vi.fn(
      async () => new Response(JSON.stringify({ results: [] })),
    ) as unknown as typeof fetch;
    await searchTmdb("Sinners", "movie", undefined, 3, impl);
    const [url, init] = vi.mocked(impl).mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).not.toContain("api_key");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${"x".repeat(60)}`,
    );
  });
});

describe("findImageCandidates", () => {
  it("puts book covers first, then Wikipedia, then Commons, without duplicates", async () => {
    const { impl, calls } = fakeFetch({
      [OPENLIBRARY]: { docs: [{ title: "Project Hail Mary", cover_i: 7 }] },
      [WIKI]: {
        query: {
          pages: [
            {
              title: "Project Hail Mary",
              index: 1,
              original: { source: "https://upload.wikimedia.org/w/phm.jpg" },
            },
          ],
        },
      },
      [COMMONS]: {
        query: {
          pages: [
            {
              title: "File:phm.jpg",
              index: 1,
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/w/phm.jpg",
                  mime: "image/jpeg",
                },
              ],
            },
          ],
        },
      },
    });
    const result = await findImageCandidates(
      {
        kind: "book",
        title: "Project Hail Mary",
        creator: "Andy Weir",
        queries: ["Project Hail Mary"],
      },
      impl,
    );
    expect(result.map((c) => c.source)).toEqual(["openlibrary", "wikipedia"]);
    // Commons isn't searched for books.
    expect(calls.some((c) => c.startsWith(COMMONS))).toBe(false);
    // One Wikipedia query: "Project Hail Mary" appears in both queries and title.
    expect(calls.filter((c) => c.startsWith(WIKI))).toHaveLength(1);
  });

  it("doesn't look up book covers for a TV show", async () => {
    const { impl, calls } = fakeFetch({ [WIKI]: wikiPages });
    await findImageCandidates(
      { kind: "tv", title: "Stick", queries: ["Stick (TV series)"] },
      impl,
    );
    expect(calls.some((c) => c.startsWith(OPENLIBRARY))).toBe(false);
  });

  it("ranks the closest name match first", async () => {
    const { impl } = fakeFetch({
      [WIKI]: {
        query: {
          pages: [
            {
              title: "India pale ale",
              index: 1,
              original: { source: "https://upload.wikimedia.org/w/ipa.jpg" },
            },
            {
              title: "Two Hearted River",
              index: 2,
              original: { source: "https://upload.wikimedia.org/w/river.jpg" },
            },
          ],
        },
      },
      [COMMONS]: {
        query: {
          pages: [
            {
              title: "File:Bell's Two Hearted Ale.jpg",
              index: 1,
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/c/bells.jpg",
                  mime: "image/jpeg",
                },
              ],
            },
          ],
        },
      },
    });
    const result = await findImageCandidates(
      { kind: "drink", title: "Two Hearted Ale", queries: ["Two Hearted Ale"] },
      impl,
    );
    expect(result.map((c) => c.label)).toEqual([
      "Bell's Two Hearted Ale",
      "Two Hearted River",
      "India pale ale",
    ]);
  });

  it("caps the number of candidates", async () => {
    const pages = Array.from({ length: 5 }, (_, i) => ({
      title: `Page ${i}`,
      index: i,
      original: {
        source: `https://upload.wikimedia.org/p/${Math.random()}.jpg`,
      },
    }));
    const impl = vi.fn(
      async () => new Response(JSON.stringify({ query: { pages } })),
    ) as unknown as typeof fetch;
    const result = await findImageCandidates(
      { kind: "other", title: "a", queries: ["b", "c", "d"] },
      impl,
    );
    expect(result.length).toBeLessThanOrEqual(8);
  });
});

describe("isCandidateImageUrl", () => {
  it.each([
    ["https://upload.wikimedia.org/a.jpg", true],
    ["https://thumb.wikimedia.org/x/thumb/a.jpg/1920px-a.jpg", true],
    ["https://covers.openlibrary.org/b/id/1-L.jpg", true],
    ["https://image.tmdb.org/t/p/original/a.jpg", true],
    ["http://upload.wikimedia.org/a.jpg", false],
    ["https://evil.example.com/a.jpg", false],
    ["https://upload.wikimedia.org.evil.com/a.jpg", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isCandidateImageUrl(url)).toBe(expected);
  });
});

describe("previewOf", () => {
  it("swaps a large Wikimedia rendition for the 500px one", () => {
    expect(
      previewOf("https://thumb.wikimedia.org/a/thumb/b.jpg/1920px-b.jpg"),
    ).toBe("https://thumb.wikimedia.org/a/thumb/b.jpg/500px-b.jpg");
  });

  it("leaves small renditions and originals alone", () => {
    const small = "https://thumb.wikimedia.org/a/thumb/b.jpg/330px-b.jpg";
    const original = "https://upload.wikimedia.org/a/b.jpg";
    expect(previewOf(small)).toBe(small);
    expect(previewOf(original)).toBe(original);
  });
});

describe("Wikipedia relevance uses the item's own name", () => {
  it("drops an article that only matches a word from the AI's phrases", async () => {
    const { impl } = fakeFetch({
      [WIKI]: {
        query: {
          pages: [
            {
              title: "Stick (TV series)",
              index: 1,
              original: { source: "https://upload.wikimedia.org/w/stick.jpg" },
            },
            {
              title: "Apple TV (device)",
              index: 2,
              original: {
                source: "https://upload.wikimedia.org/w/appletv.jpg",
              },
            },
          ],
        },
      },
    });
    const result = await findImageCandidates(
      { kind: "tv", title: "Stick", queries: ["Stick Apple TV+"] },
      impl,
    );
    expect(result.map((c) => c.label)).toEqual(["Stick (TV series)"]);
  });
});

describe("isRelevant", () => {
  const candidate = (
    source: "wikipedia" | "commons" | "tmdb",
    label: string,
  ) => ({
    url: "https://upload.wikimedia.org/a.jpg",
    thumbnailUrl: "https://upload.wikimedia.org/a.jpg",
    source,
    label,
  });

  it("keeps Wikipedia articles that mention the item and drops unrelated ones", () => {
    expect(
      isRelevant(candidate("wikipedia", "Stick (TV series)"), ["Stick"]),
    ).toBe(true);
    expect(
      isRelevant(candidate("wikipedia", "Amazon Fire TV"), ["Stick"]),
    ).toBe(false);
    expect(
      isRelevant(candidate("wikipedia", "Ryan Coogler"), ["Sinners"]),
    ).toBe(false);
  });

  it("needs most of the name in a Commons file name", () => {
    expect(
      isRelevant(candidate("commons", "Bell's Two Hearted Ale"), [
        "Two Hearted Ale",
      ]),
    ).toBe(true);
    // The AI said IPA, the photo says Ale: two of three words still match.
    expect(
      isRelevant(candidate("commons", "Bell's Two Hearted Ale"), [
        "Two Hearted IPA",
      ]),
    ).toBe(true);
    expect(
      isRelevant(candidate("commons", "Birds on stick Shanghai"), [
        "Stick owen wilson",
      ]),
    ).toBe(false);
    expect(
      isRelevant(candidate("commons", "Guinness pint"), ["Guinness"]),
    ).toBe(true);
  });

  it("also matches the AI's search phrases", () => {
    expect(
      isRelevant(candidate("commons", "Bell's Two Hearted Ale"), [
        "Two Hearted",
        "Bell's Two Hearted Ale",
      ]),
    ).toBe(true);
  });

  it("trusts poster and cover searches", () => {
    expect(isRelevant(candidate("tmdb", "Something else"), ["Stick"])).toBe(
      true,
    );
  });

  it("ignores accents and filler words", () => {
    expect(significantWords("The Café of the Book")).toEqual(["cafe"]);
  });
});
