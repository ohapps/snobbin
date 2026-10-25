/**
 * Pure mapping helpers for the offline layer.
 *
 * Kept free of browser/worker dependencies so they can be unit-tested in Node
 * (the rest of `src/data/local` needs OPFS + a Worker, which vitest's node
 * environment cannot provide).
 */

import type { SnobGroupSearchParams } from "@/types/snobGroup";

/**
 * Extracts `attr_<attributeId>=<value>` entries from the search params, matching
 * how `app/groups/[groupId]/page.tsx` builds `attributeFilters` server-side.
 */
export function parseAttributeFilters(
  searchParams: SnobGroupSearchParams,
): Record<string, string> {
  const filters: Record<string, string> = {};
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key.startsWith("attr_") && typeof value === "string" && value) {
      filters[key.replace("attr_", "")] = value;
    }
  });
  return filters;
}

/** Normalises a keyword into a SQL `LIKE` pattern (lower-cased to match ILIKE). */
export function toLikePattern(keyword: string): string {
  return `%${keyword.toLowerCase()}%`;
}
