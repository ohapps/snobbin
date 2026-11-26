/**
 * Finds candidate pictures for an identified item (cover, poster, label…)
 * from free public sources, so the user can pick one instead of hunting for
 * an image. Every source is optional: failures and timeouts just mean fewer
 * candidates.
 */

export const ITEM_KINDS = [
  "book",
  "movie",
  "tv",
  "music",
  "game",
  "drink",
  "food",
  "place",
  "product",
  "other",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export type ImageSource = "wikipedia" | "commons" | "openlibrary" | "tmdb";

export interface ImageCandidate {
  /** Full-size image, copied to Cloudinary when picked. */
  url: string;
  /** Small version for the picker. */
  thumbnailUrl: string;
  source: ImageSource;
  /** What the image is of, e.g. the Wikipedia article or book title. */
  label: string;
}

export interface ImageSearch {
  kind: ItemKind;
  title: string;
  /** Author, director, brewery… helps narrow book and film searches. */
  creator?: string;
  year?: string;
  /** Extra search phrases from the AI, e.g. "Stick (TV series)". */
  queries: string[];
}

const MAX_CANDIDATES = 8;
const SOURCE_TIMEOUT_MS = 5_000;
const HEADERS = { "User-Agent": "SnobbinApp/1.0 (contact@snobbin.com)" };

/** Hosts whose images we offer, and so the only ones we'll copy to Cloudinary. */
const CANDIDATE_HOSTS = [
  "upload.wikimedia.org",
  "covers.openlibrary.org",
  "image.tmdb.org",
];

export const isCandidateImageUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && CANDIDATE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
};

const getJson = async <T>(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T | null> => {
  try {
    const res = await fetchImpl(url, {
      ...init,
      headers: { ...HEADERS, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
};

// -------------------------------------------------------------- Wikipedia ---

interface WikiPage {
  title: string;
  index?: number;
  pageprops?: { disambiguation?: string };
  original?: { source: string };
  thumbnail?: { source: string };
}

export const searchWikipedia = async (
  query: string,
  limit = 3,
  fetchImpl?: typeof fetch,
): Promise<ImageCandidate[]> => {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "5",
    prop: "pageimages|pageprops",
    piprop: "original|thumbnail",
    // Posters and covers are almost never freely licensed, and the API only
    // returns free images unless asked.
    pilicense: "any",
    pithumbsize: "400",
    ppprop: "disambiguation",
    redirects: "1",
  });
  const data = await getJson<{ query?: { pages?: WikiPage[] } }>(
    `https://en.wikipedia.org/w/api.php?${params}`,
    {},
    fetchImpl,
  );
  return (data?.query?.pages ?? [])
    .filter(
      (page) => page.pageprops?.disambiguation === undefined && page.original,
    )
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .slice(0, limit)
    .map((page) => ({
      url: page.original!.source,
      thumbnailUrl: page.thumbnail?.source ?? page.original!.source,
      source: "wikipedia" as const,
      label: page.title,
    }));
};

// ---------------------------------------------------------------- Commons ---

interface CommonsPage {
  title: string;
  index?: number;
  imageinfo?: { url: string; thumburl?: string; mime?: string }[];
}

export const searchCommons = async (
  query: string,
  limit = 3,
  fetchImpl?: typeof fetch,
): Promise<ImageCandidate[]> => {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "6",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "400",
  });
  const data = await getJson<{ query?: { pages?: CommonsPage[] } }>(
    `https://commons.wikimedia.org/w/api.php?${params}`,
    {},
    fetchImpl,
  );
  return (data?.query?.pages ?? [])
    .filter((page) =>
      /^image\/(jpeg|png|webp)$/.test(page.imageinfo?.[0]?.mime ?? ""),
    )
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .slice(0, limit)
    .map((page) => {
      const info = page.imageinfo![0];
      return {
        url: info.url,
        thumbnailUrl: info.thumburl ?? info.url,
        source: "commons" as const,
        label: page.title.replace(/^File:/, "").replace(/\.\w+$/, ""),
      };
    });
};

// ------------------------------------------------------------ Open Library ---

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  cover_i?: number;
}

export const searchOpenLibrary = async (
  title: string,
  author?: string,
  limit = 3,
  fetchImpl?: typeof fetch,
): Promise<ImageCandidate[]> => {
  const params = new URLSearchParams({
    title,
    limit: "8",
    fields: "title,author_name,cover_i",
  });
  if (author) params.set("author", author);
  const data = await getJson<{ docs?: OpenLibraryDoc[] }>(
    `https://openlibrary.org/search.json?${params}`,
    {},
    fetchImpl,
  );
  const seen = new Set<number>();
  return (data?.docs ?? [])
    .filter(
      (doc) => doc.cover_i && !seen.has(doc.cover_i) && seen.add(doc.cover_i),
    )
    .slice(0, limit)
    .map((doc) => ({
      url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
      thumbnailUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
      source: "openlibrary" as const,
      label: [doc.title, doc.author_name?.[0]].filter(Boolean).join(" · "),
    }));
};

// ------------------------------------------------------------------- TMDB ---

interface TmdbResult {
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

/**
 * Movie/TV posters. Needs TMDB_API_KEY (a v3 API key or a v4 read access
 * token, both free at themoviedb.org); skipped without one.
 */
export const searchTmdb = async (
  title: string,
  kind: "movie" | "tv",
  year?: string,
  limit = 3,
  fetchImpl?: typeof fetch,
): Promise<ImageCandidate[]> => {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) return [];

  const isReadToken = key.length > 40;
  const params = new URLSearchParams({ query: title, include_adult: "false" });
  if (!isReadToken) params.set("api_key", key);
  if (year && /^\d{4}$/.test(year)) {
    params.set(kind === "movie" ? "year" : "first_air_date_year", year);
  }

  const data = await getJson<{ results?: TmdbResult[] }>(
    `https://api.themoviedb.org/3/search/${kind}?${params}`,
    isReadToken ? { headers: { Authorization: `Bearer ${key}` } } : {},
    fetchImpl,
  );
  return (data?.results ?? [])
    .filter((result) => result.poster_path)
    .slice(0, limit)
    .map((result) => ({
      url: `https://image.tmdb.org/t/p/original${result.poster_path}`,
      thumbnailUrl: `https://image.tmdb.org/t/p/w342${result.poster_path}`,
      source: "tmdb" as const,
      label: [
        result.title ?? result.name,
        (result.release_date ?? result.first_air_date)?.slice(0, 4),
      ]
        .filter(Boolean)
        .join(" · "),
    }));
};

// ------------------------------------------------------------- relevance ---

const STOP_WORDS = new Set([
  "the",
  "and",
  "of",
  "a",
  "an",
  "in",
  "on",
  "to",
  "for",
  "by",
  "with",
  "file",
  "jpg",
  "png",
  "tv",
  "series",
  "film",
  "novel",
  "book",
  "beer",
]);

export const significantWords = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

/**
 * How well a picture's label matches the item, from 0 to 1: the best share of
 * words found, over the item's name and the AI's search phrases (the AI may
 * say "Two Hearted IPA" where the photo is "Bell's Two Hearted Ale").
 * Covers and posters from title searches count as full matches.
 */
export const matchScore = (candidate: ImageCandidate, names: string[]) => {
  if (candidate.source === "openlibrary" || candidate.source === "tmdb") {
    return 1;
  }
  const label = new Set(significantWords(candidate.label));
  let best = 0;
  for (const name of names) {
    const wanted = significantWords(name);
    if (wanted.length === 0) continue;
    const found = wanted.filter((w) => label.has(w)).length;
    // Commons is noisy: a single shared word ("stick") isn't enough there
    // unless the name is a single word.
    if (candidate.source === "commons" && found < Math.min(2, wanted.length)) {
      continue;
    }
    best = Math.max(best, found / wanted.length);
  }
  return best;
};

/**
 * Wikipedia search returns loosely related articles (the director, the
 * streaming service…) and Commons is noisier still, so keep only pictures
 * whose label mentions the item: any word of its name for Wikipedia, most of
 * it for Commons.
 */
export const isRelevant = (candidate: ImageCandidate, names: string[]) => {
  const score = matchScore(candidate, names);
  return candidate.source === "commons" ? score >= 0.6 : score > 0;
};

const MEDIA_KINDS: ItemKind[] = ["book", "movie", "tv", "music", "game"];

// ------------------------------------------------------------------- main ---

export const findImageCandidates = async (
  search: ImageSearch,
  fetchImpl?: typeof fetch,
): Promise<ImageCandidate[]> => {
  const queries = Array.from(
    new Set(
      [...search.queries, search.title].map((q) => q.trim()).filter(Boolean),
    ),
  ).slice(0, 3);

  // Most specific sources first: they're the most likely to be the right picture.
  const lookups: Promise<ImageCandidate[]>[] = [];
  if (search.kind === "book") {
    lookups.push(searchOpenLibrary(search.title, search.creator, 3, fetchImpl));
  }
  if (search.kind === "movie" || search.kind === "tv") {
    lookups.push(
      searchTmdb(search.title, search.kind, search.year, 3, fetchImpl),
    );
  }
  queries.forEach((query, i) =>
    lookups.push(searchWikipedia(query, i === 0 ? 5 : 3, fetchImpl)),
  );
  // Commons has photos of things (bottles, dishes, places) that Wikipedia
  // articles often lack. Covers and posters come from the other sources, so
  // skip it for media, where it only adds noise.
  if (!MEDIA_KINDS.includes(search.kind)) {
    // Commons search needs every word to match, so "Two Hearted IPA" misses a
    // photo filed as "Bell's Two Hearted Ale". Also try the name without its
    // last word, which is often a style or type.
    const words = search.title.trim().split(/\s+/);
    const shorter = words.length >= 3 ? words.slice(0, -1).join(" ") : "";
    const commonsQueries = Array.from(
      new Set([...queries, shorter].filter(Boolean)),
    ).slice(0, 3);
    commonsQueries.forEach((query) =>
      lookups.push(searchCommons(query, 6, fetchImpl)),
    );
  }

  const results = await Promise.all(lookups);
  const seen = new Set<string>();
  const candidates: ImageCandidate[] = [];
  for (const candidate of results.flat()) {
    if (
      !isCandidateImageUrl(candidate.url) ||
      seen.has(candidate.url) ||
      !isRelevant(candidate, queries)
    ) {
      continue;
    }
    seen.add(candidate.url);
    candidates.push(candidate);
  }
  // Best name matches first; ties keep source order (covers/posters first).
  return candidates
    .map((candidate, order) => ({
      candidate,
      order,
      score: matchScore(candidate, queries),
    }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_CANDIDATES)
    .map(({ candidate }) => candidate);
};
