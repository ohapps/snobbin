import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeFilters,
  clearRememberedFilters,
  hasFilterParams,
  loadRememberedFilters,
  saveRememberedFilters,
} from "../remembered-filters";

/** Minimal in-memory `localStorage` (vitest runs in node). */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hasFilterParams", () => {
  it("is false for a bare group URL or one with only sort/search/page", () => {
    expect(hasFilterParams({})).toBe(false);
    expect(
      hasFilterParams({ sortBy: "RANKING", keyword: "x", page: "2" }),
    ).toBe(false);
  });

  it("is true for an explicit filter, including RESET's 'all'", () => {
    expect(hasFilterParams({ status: "pending" })).toBe(true);
    expect(hasFilterParams({ status: "all" })).toBe(true);
    expect(hasFilterParams({ attr_a1: "all" })).toBe(true);
  });
});

describe("activeFilters", () => {
  it("keeps non-'all' status and attributes the group still has", () => {
    expect(
      activeFilters(
        {
          status: "pending",
          attr_a1: "Red",
          attr_a2: "all",
          attr_gone: "Old",
          sortBy: "RANKING",
          page: "3",
        },
        ["a1", "a2"],
      ),
    ).toEqual({ status: "pending", attr_a1: "Red" });
  });

  it("is empty after a reset", () => {
    expect(activeFilters({ status: "all", attr_a1: "all" }, ["a1"])).toEqual(
      {},
    );
  });
});

describe("remembered filter storage", () => {
  it("round-trips per user and group", () => {
    saveRememberedFilters("user-1", "g1", { status: "pending" });
    expect(loadRememberedFilters("user-1", "g1")).toEqual({
      status: "pending",
    });
    expect(loadRememberedFilters("user-1", "g2")).toEqual({});
    expect(loadRememberedFilters("user-2", "g1")).toEqual({});
  });

  it("forgets the filter when saved empty (reset)", () => {
    saveRememberedFilters("user-1", "g1", { status: "pending" });
    saveRememberedFilters("user-1", "g1", {});
    expect(loadRememberedFilters("user-1", "g1")).toEqual({});
    expect(localStorage.length).toBe(0);
  });

  it("ignores corrupt or unexpected stored values", () => {
    localStorage.setItem("snobbin-filters:user-1:g1", "{not json");
    expect(loadRememberedFilters("user-1", "g1")).toEqual({});

    localStorage.setItem(
      "snobbin-filters:user-1:g1",
      JSON.stringify({ status: "ranked", sortBy: "RANKING", attr_a1: 5 }),
    );
    expect(loadRememberedFilters("user-1", "g1")).toEqual({
      status: "ranked",
    });
  });

  it("clears only remembered filters", () => {
    saveRememberedFilters("user-1", "g1", { status: "pending" });
    saveRememberedFilters("user-2", "g2", { attr_a1: "Red" });
    localStorage.setItem("snobbin-offline:identity", "user-1");

    clearRememberedFilters();

    expect(loadRememberedFilters("user-1", "g1")).toEqual({});
    expect(loadRememberedFilters("user-2", "g2")).toEqual({});
    expect(localStorage.getItem("snobbin-offline:identity")).toBe("user-1");
  });

  it("does nothing when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() =>
      saveRememberedFilters("user-1", "g1", { status: "pending" }),
    ).not.toThrow();
    expect(loadRememberedFilters("user-1", "g1")).toEqual({});
  });
});
