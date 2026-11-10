/**
 * Remembers the last filter applied to each group, so reopening the group
 * re-applies it until the user resets it from the filter menu.
 *
 * Only the filter menu's values are remembered: `status` and `attr_<id>`.
 * Sort order, search keyword and page are not.
 *
 * Stored in `localStorage` per user (Auth0 `sub`) and group, so it works the
 * same online and offline and two accounts on one device never share filters.
 */

import type { SnobGroupSearchParams } from "@/types/snobGroup";

const KEY_PREFIX = "snobbin-filters:";
const ATTR_PREFIX = "attr_";
/** The filter menu's "no filter" value, for status and attributes alike. */
const ALL = "all";

export type RememberedFilters = Record<string, string>;

function storageKey(sub: string | null, groupId: string): string {
  return `${KEY_PREFIX}${sub ?? "anonymous"}:${groupId}`;
}

/**
 * True when the URL states a filter, including an explicit "all" (which is
 * what RESET writes). Only a URL with no filter params gets the remembered
 * filter applied, so a reset or a shared filtered link always wins.
 */
export function hasFilterParams(params: SnobGroupSearchParams): boolean {
  return Object.keys(params).some(
    (key) => key === "status" || key.startsWith(ATTR_PREFIX),
  );
}

/**
 * The active (non-"all") filters in `params`. Attribute filters are kept only
 * for attributes the group still has, so a deleted attribute can't leave a
 * filter behind that the menu can no longer show or reset.
 */
export function activeFilters(
  params: SnobGroupSearchParams,
  attributeIds: readonly string[],
): RememberedFilters {
  const filters: RememberedFilters = {};
  if (params.status && params.status !== ALL) {
    filters.status = params.status;
  }
  attributeIds.forEach((id) => {
    const value = params[`${ATTR_PREFIX}${id}`];
    if (value && value !== ALL) filters[`${ATTR_PREFIX}${id}`] = value;
  });
  return filters;
}

export function loadRememberedFilters(
  sub: string | null,
  groupId: string,
): RememberedFilters {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(sub, groupId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const filters: RememberedFilters = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (
        typeof value === "string" &&
        (key === "status" || key.startsWith(ATTR_PREFIX))
      ) {
        filters[key] = value;
      }
    });
    return filters;
  } catch {
    return {};
  }
}

/** Saves the filters, or forgets them when none are active. */
export function saveRememberedFilters(
  sub: string | null,
  groupId: string,
  filters: RememberedFilters,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const key = storageKey(sub, groupId);
    if (Object.keys(filters).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(filters));
  } catch {
    // Storage can be full or blocked; the filter just won't be remembered.
  }
}

/** Forgets every remembered filter on this device (used on logout). */
export function clearRememberedFilters(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
