# Offline Read-Only Support

After a user has logged in and browsed online once, `snobbin-web` keeps working
**read-only** when the device is offline **or the API server is unreachable**, without
forcing a re-login. Groups, items, rankings, and item images render from on-device
storage.

The dominant offline use is a pure read — "has this item been ranked yet?" — so there
is no write queue: all mutations are hidden while offline.

> This doc describes what is built. Code comments link here by section name
> (e.g. "OFFLINE_PLAN.md › Sync").

---

## Design decision (Nov 2026)

**Decision:** keep a hand-rolled, one-way **server → IndexedDB (Dexie) mirror** plus a
custom service worker (Serwist), rather than adopting a sync engine or SQLite in the
browser. Revisit only if offline **writes** become a requirement.

**Why:**

- **Read-only is the easy case.** No conflict resolution, write queue, or replay — the
  main things sync engines solve.
- **IndexedDB is the most portable store.** It works in every browser and installed
  PWA (including Safari) with no worker, WASM asset, or COOP/COEP headers. The first
  implementation used SQLite WASM (wa-sqlite over OPFS) and hit the usual problems:
  OPFS differences across browsers, the fast VFSes needing COOP/COEP (which break
  Auth0 and Cloudinary), and extra worker/WASM plumbing.
- **The data is small.** ~1,600 items per group fits comfortably; an indexed lookup
  plus in-memory filter/sort is fast enough, so a SQL engine buys little.
- **The real risks weren't the storage library.** They were local queries drifting
  from the server's `getItems()`, full re-syncs, and an unmaintained service-worker
  plugin. Those were addressed directly: parity tests (§10), incremental sync (§5), and
  the move from `next-pwa` to Serwist (§7).

**Alternatives considered:**

| Option                                           | Fit                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ElectricSQL (shapes)                             | Read-only Postgres → client streaming; would replace the hand-written `/api/offline/*` routes. Closest fit if sync code grows. |
| PowerSync                                        | Mature offline **writes** against Postgres, but brings SQLite back into the browser.                                           |
| RxDB (on Dexie)                                  | Reactive queries + replication plugins; mainly worthwhile once writes are needed.                                              |
| Replicache / Zero, TinyBase                      | Local-first / realtime collaboration; more than "has this been ranked?" needs.                                                 |
| SQLite WASM (wa-sqlite, official build, SQLocal) | Tried first; replaced for the reasons above.                                                                                   |

Any of these would be a rewrite of the data layer and would only remove the
duplicated query logic if queries also moved into that library's query layer.

---

## 1. Architecture at a glance

```
Online
  RSC page (Postgres via Drizzle) ──▶ client shell renders server data
        └─▶ useAutoSync (background, non-blocking)
              ├─ GET /api/offline/bootstrap            → groups, memberships, snobs
              ├─ GET /api/offline/groups/:id/meta      → group, members, attributes, invites
              ├─ GET /api/offline/groups/:id/items?page → full mirror, 20 items/page
              ├─ GET /api/offline/groups/:id/changes    → incremental refresh afterwards
              │     └─▶ IndexedDB mirror (Dexie, one DB per Auth0 user)
              └─ warmGroupImages                       → thumbnails into Cache Storage

Offline OR server unreachable  (navigator offline, or /api/health probe fails)
  service worker serves the cached document (also on 5xx / 3s timeout)
    └─▶ RSC fetch fails → page passes `null` → client shell reads the mirror
    └─▶ no redirect to login (remembered identity in localStorage)
    └─▶ thumbnails served from Cache Storage
    └─▶ write controls hidden (readOnly)

Reconnect
  OfflineReconnect → refreshBootstrap() + router.refresh() → live server view
```

Key modules:

| Area                 | Files                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connectivity         | `src/hooks/useConnectivity.ts`, `src/app/api/health/route.ts`                                                                                                               |
| Identity / isolation | `src/data/local/identity.ts`, `src/config/offline.ts`, `src/components/Offline/OfflineIdentitySync.tsx`, `src/hooks/useOfflineIdentity.ts`, `src/hooks/useOfflineLogout.ts` |
| Local mirror         | `src/data/local/dexie-db.ts`, `src/data/local/schema.ts` (row types)                                                                                                        |
| Sync                 | `src/app/api/offline/**`, `src/data/local/dexie-sync.ts`, `src/data/local/api-types.ts`, `src/hooks/useAutoSync.ts`                                                         |
| Local reads          | `src/data/local/repositories.ts` (public API), `src/data/local/dexie-repositories.ts`, `src/data/local/mappers.ts`                                                          |
| Read paths / UI      | `src/hooks/useGroupPageData.ts`, `*PageClient.tsx`, `src/components/Offline/*`                                                                                              |
| Service worker       | `sw.js` (root, Serwist), `next.config.mjs`, `src/initializers/PwaInitializer.tsx`                                                                                           |
| Tests                | `src/data/local/__tests__/dexie-local.test.ts`, `src/data/local/__tests__/mappers.test.ts`                                                                                  |
| Images               | `src/data/local/warm-images.ts`, `src/components/Image/ImagePreview.tsx`, `src/utils/image-cors.ts`                                                                         |
| Settings / clear     | `src/components/Profile/OfflineDataSettings.tsx`, `src/data/local/clear.ts`                                                                                                 |

`OFFLINE_ENABLED` (`src/config/offline.ts`) is a constant `true`. It still guards the
"swallow server errors and fall back to the mirror" branches, so flipping it restores
the original throw-on-error behaviour.

---

## 2. Connectivity

`navigator.onLine` stays `true` when the API is down or returning 5xx, so
`useConnectivity()` reports offline when **either**:

- the browser reports offline, **or**
- the `/api/health` probe fails (every 30 s, and immediately on the `online` event).

Callers can also `reportFailure()` / `reportSuccess()` after their own requests. The
service worker serves `/api/health` `NetworkOnly` so a cached 200 can never mask an
outage.

---

## 3. Identity and session

- **Remembered identity.** The Auth0 `sub` and the database snob id are kept in
  `localStorage` (`identity.ts`). It is needed before the mirror can be opened (the DB
  name is derived from it) and must be readable with no network. It only selects a
  read-only mirror; it is never proof of identity for writes.
- **Per-user mirror.** The IndexedDB name is `snobbin-offline-<sub>.db`. A second
  account on the device opens a different, empty mirror; `OfflineIdentitySync` wipes
  the previous user's data when the signed-in identity changes. Offline, `useUser()`
  can't resolve, so the remembered identity is kept.
- **No forced re-login.** `AuthInitializer` still redirects when there is genuinely
  no session, but when the session check _throws_ (server/DB down) it lets the shell
  render so the mirror can be used.
- **Logout** (`useOfflineLogout`) deletes the mirror and the image caches before
  redirecting to Auth0 logout.

---

## 4. Local mirror (IndexedDB via Dexie)

`SnobbinOfflineDB` (`dexie-db.ts`) tables and indexes:

| Table              | Indexes                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `groups`           | `id, name`                                                                                                     |
| `snobs`            | `id, email`                                                                                                    |
| `group_members`    | `id, groupId, snobId`                                                                                          |
| `group_invites`    | `id, groupId, email`                                                                                           |
| `group_attributes` | `id, groupId, name`                                                                                            |
| `items`            | `id, groupId, ranked, averageRanking, description`                                                             |
| `item_attributes`  | `id, itemId, attributeId, attributeValue`                                                                      |
| `rankings`         | `id, itemId, groupMemberId`                                                                                    |
| `sync_meta`        | `groupId` — `complete`, `highestPageSynced`, `totalItems`, `lastSyncedAt`, `state` (JSON: `{ changesCursor }`) |

Row types come from `schema.ts`, which is a leftover Drizzle `sqliteTable` schema from
the original SQLite design; it is used for types only.

> **History:** the first implementation used SQLite WASM (wa-sqlite over OPFS, with a
> Drizzle `sqlite-proxy` driver). It was replaced by Dexie/IndexedDB, which needs no
> worker, WASM asset, or vendored library and has no COOP/COEP concerns. Some comments
> and names (e.g. `offlineDbNameFor` producing `.sqlite3`, mapped to `.db`) still
> reflect that history. `src/vendor/` is an empty leftover directory.

---

## 5. Sync

### 5.1 Sync API

All routes use the Auth0 session cookie, return snake_case shapes from
`mobile-formatters` (typed in `api-types.ts`), and are **not** gated by
`OFFLINE_ENABLED` — background fill runs in the normal app. The service worker serves
`/api/offline/*` `NetworkOnly` so the mirror never syncs from a stale cache.

| Route                                             | Returns                                                                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/offline/bootstrap`                      | The user, their non-deleted groups (non-`DISABLED` membership), all memberships and snobs for those groups                                                                             |
| `GET /api/offline/groups/:id/meta`                | Group, members, snobs, attributes, invites, `totalItems`, `serverTime` (seeds the change cursor)                                                                                       |
| `GET /api/offline/groups/:id/items?page&pageSize` | One page of items + their attributes + rankings, ordered `(created_date DESC, id ASC)` so pages never overlap                                                                          |
| `GET /api/offline/groups/:id/changes?since=<ISO>` | Items with `updated_date > since` + **all** their attributes and rankings; every current item id (to prune hard deletes); a new `cursor`. `{ tooMany: true }` above 500 changed items. |

`/changes` relies on two server facts: saving a ranking recalculates the item's
average and bumps its `updated_date` (`calculate-average-ranking.ts`), and items are
hard-deleted (so deletions are detected from the id list, not timestamps). The cursor
is taken from the server clock _before_ querying, so writes that land mid-request are
picked up next time.

### 5.2 Client sync (`dexie-sync.ts`)

- **`syncBootstrapDexie()`** — writes snobs, groups, memberships; records the snob id;
  creates a `sync_meta` row for each new group; then **prunes** any group the server no
  longer returns (deleted, left, or disabled): its `sync_meta`, group row, members,
  attributes, items, item attributes, and rankings. Invites are kept because pending
  invites can reference groups the user hasn't joined.
- **`syncGroupDexie(groupId)`** — always refreshes meta first, **replacing** the
  group's members, attributes, and invites (so removals propagate) and dropping item
  values for attributes the group no longer has. Then:
  - **Incremental** — if the group is `complete` and has a `changesCursor`: one
    `/changes` call (from 2 min before the cursor, to absorb clock skew; re-applying
    is harmless). Changed items have their attributes and rankings replaced; local
    items missing from `itemIds` are deleted.
  - **Full** — otherwise (first sync, interrupted sync, no cursor, or `tooMany`):
    pages through every item, one transaction per page, replacing each item's
    attributes and rankings; on the last page deletes local items the server didn't
    return and stores `meta.serverTime` as the cursor. An interrupted full sync stays
    `complete: false` and restarts from page 1 next time.

### 5.3 When sync runs (`useAutoSync`)

Called by the group page. Visiting a group online silently mirrors it:

- **Bootstrap** runs first, at most once per 15 min (forced on reconnect).
- **Group sync** is skipped if the group is `complete` and synced within 5 min;
  otherwise it runs (usually incremental, so cheap).
- **Thumbnails** are pre-cached after a sync, and once per tab per group otherwise
  (see Images).
- Runs are deduped per group, aborted on unmount, gated on a known identity (never
  writes to the anonymous DB), and call `navigator.storage.persist()` so the mirror
  isn't evicted as best-effort storage.

---

## 6. Offline read paths

Every read page keeps its RSC fetch for the online path, wrapped in try/catch: on
failure it passes `null` and a client shell renders from the mirror via
`src/data/local/repositories.ts`, which returns the same shapes as the server utils
(`SnobGroup`, `PaginatedResults`, …).

| Route              | Client shell / hook                         | Local reads                                       |
| ------------------ | ------------------------------------------- | ------------------------------------------------- |
| `/`                | `OfflineHomeRedirect`                       | `getLocalLastGroupId`                             |
| `/groups`          | `GroupsPageClient`                          | `getLocalGroups` (active membership, not deleted) |
| `/groups/:groupId` | `GroupPageClient` + `useGroupPageData`      | group, items, attribute summary                   |
| `/activity`        | `ActivityPageClient`                        | pending invites, recent rankings                  |
| `/profile`         | `ProfilePageClient` + `OfflineDataSettings` | current user, sync states                         |

**Query parity.** `getLocalItemsDexie` mirrors `getItems()`: sort (`MOST_RECENT`
default → created date desc, `DESCRIPTION`, `RANKING`, id tiebreak), status (`ranked`
/ `pending`), keyword (description **or** any attribute value), and exact-match
attribute filters, 20 per page. Local groups include `members`, `attributes`, and
`invites`, and item attributes are keyed by attribute **id** — the presentational
components depend on both.

**Offline query changes don't use the router.** `router.push` would trigger an RSC
fetch that can't be served offline, so `GroupPageClient` owns the query params in
local state when reading from the mirror and passes `onUpdateQuery` down through
`GroupDetails` → `ItemList`.

**Read-only.** `readOnly = !online || source === "local"`. Gating on the data source
alone isn't enough: cached RSC data can stay on screen after connectivity drops. All
write entry points are hidden (not just disabled): new item/group, item and group
menus, ranking editor (saved ranking shown read-only), invites, member management,
pending-invite accept/decline, profile editing, and the item/group drawers. The SSE
`EventSource` (`useGroupEvents`) is not opened while `readOnly`.

---

## 7. Service worker

Built by **Serwist** (`@serwist/next` + `serwist`, the maintained successor to
`next-pwa`/Workbox) from a custom `sw.js` (root) into `public/sw.js`. Config in
`next.config.mjs`:

- `disable` outside production — `next dev` has no worker.
- `register: false` — registration is explicit in `PwaInitializer`, production only.
- `reloadOnOnline: false` — Serwist would otherwise hard-reload the page whenever the
  browser comes back online; `OfflineReconnect` re-syncs and soft-refreshes instead.
- `exclude: [/\.map$/, /^manifest.*\.js$/, /app-build-manifest\.json$/]` — a single
  non-200 precache entry fails the whole install. `app-build-manifest.json` is
  redirected by the auth guard (307); the first two are Serwist's defaults, repeated
  because setting `exclude` replaces them.

The worker precaches the build output (`precacheOptions.cleanupOutdatedCaches`, which
also removes the old Workbox precache), uses `skipWaiting` + `clientsClaim`, and on
activate deletes obsolete caches (`cloudinary-images`, next-pwa's `start-url`).

Routes, in order (first match wins):

1. **Navigations** (same origin) — network-first with a 3 s timeout; falls back to the
   cached document on network error, timeout, **or any non-OK response** (a crashed
   backend behind a reverse proxy usually returns 502). Cross-origin and redirected
   responses (e.g. the Auth0 login page) are never cached. Cache: `documents`, 200
   entries. With no cached copy of the URL it falls back to the cached `/`.
2. `/api/health` and `/api/offline/*` — `NetworkOnly`.
3. Cloudinary — see Images.
4. General rules carried over from next-pwa's defaults (fonts, static assets,
   `_next/image`, JS/CSS, `apis`, `others` — which includes App Router RSC payloads —
   and cross-origin).

`/` renders a cacheable page and redirects on the client: a server-side 307 isn't
cacheable, so "open the app offline" would fail.

---

## 8. Images

Item thumbnails (`CldImage` in `ImagePreview`) and Cloudinary avatars are cached
`CacheFirst` in `cloudinary-images-v2` (10,000 entries, 30 days).

- **CORS, not opaque.** Thumbnails load with `crossOrigin="anonymous"`; avatars
  (`GroupAvatar`, `ProfileAvatar`) do so only for `res.cloudinary.com` URLs
  (`cloudinaryCrossOrigin`), since other hosts may not send CORS headers. Only status
  200 is cached. Opaque (no-cors) responses are padded to ~7 MB each against quota and
  can't satisfy a later CORS image request, which made cached images break on the
  second view.
- **v2 cache name.** The pre-v2 `cloudinary-images` cache held opaque entries and is
  deleted when the new worker activates.
- **`ignoreVary`.** Cloudinary can send `Vary: Accept` (f_auto); the URL alone
  identifies the image, so any cached format is served.
- **Pre-caching** (`warm-images.ts`). Thumbnails are lazy-loaded, so items never
  scrolled to wouldn't be cached. After a group sync, each item's thumbnail (or the
  placeholder) is fetched once through the service worker, 6 at a time, with the
  browser's image `Accept` header. Already-cached URLs are answered from cache. Skipped
  when no service worker controls the page.
- **Exact URL match.** The cache is keyed by URL, so the pre-cache URL must match what
  `CldImage` renders: a 200px image is requested by next/image as `w_256` (1x) or
  `w_640` (2x). `thumbnailUrl()` uses `getCldImageUrl` with the same options and picks
  the width from `devicePixelRatio`.

---

## 9. Offline data settings

`OfflineDataSettings` on `/profile` shows storage used (`navigator.storage.estimate()`),
last sync time, and per-group mirror status (only groups that resolve locally).
**Clear offline data** deletes the IndexedDB mirror and the image caches, then reloads.

---

## 10. Testing

- **Use a production build** (`npm run build && npm start`). The service worker only
  registers in production; `next dev` has no offline support. Don't run `next build`
  while `next dev` is running — they share `.next` and the dev server breaks.
- After deploying a new worker, reload once online so it takes over (`skipWaiting` +
  `clientsClaim`).
- Chrome: DevTools → Network → **Offline**, or stop the server to test "network up,
  API down". Inspect Application → IndexedDB / Cache Storage.
- The Claude desktop browser pane can't register service workers; use it only for
  client-side checks (e.g. stubbing `fetch` to reject).
- **Unit tests:** `npm test` (Vitest). `dexie-local.test.ts` runs the real Dexie code
  against an in-memory IndexedDB (`fake-indexeddb`):
  - **Query parity with `getItems()`** — default/description/ranking sort with id
    tiebreak, `ranked`/`pending` status, keyword over description and attribute
    values, exact attribute filters, paging, item attributes keyed by id, and local
    groups including attributes and invites. When server query semantics change,
    update these cases with them.
  - **Sync** — full mirror (pages, cursor, pruning deletes), incremental changes
    (upserts, ranking replacement, deletes, overlap before the cursor), `tooMany`
    fallback to a full mirror, and removal of a deleted group attribute's values.
- After changing precache config, check every entry in `public/sw.js` returns 200 —
  one failure leaves the worker `redundant`.

Validated against a production build:

- **Chrome (Oct 2026, original SQLite mirror):** offline reload of `/`, `/groups`,
  `/activity`, `/profile` with the server stopped; no login redirect; pagination and
  search from the mirror; reconnect restores write controls; thumbnails from cache.
- **Browser pane, fetch stubbed to fail (Nov 2026, Dexie mirror):** the 1,624-item
  group page renders identically online and offline, including default order,
  `sortBy=DESCRIPTION&status=pending`, and attribute values.
- **Serwist build (Nov 2026):** production build succeeds; all 67 precache entries
  return 200; `/api/offline/groups/:id/changes` returns 401 without a session.
- **Not yet verified in Chrome Offline mode:** the Serwist worker installing and
  serving offline, incremental sync against real data, the `cloudinary-images-v2`
  cache, thumbnail pre-caching, and avatar caching.

---

## 11. Known gaps

- **Enlarged image modal** (`ImagePreview` at 300/400px) isn't pre-cached; offline it
  only shows if it was opened online.
- **Thumbnail density.** Only one width is pre-cached (by `devicePixelRatio`). Moving
  between Retina and non-Retina displays, or DevTools device emulation, requests the
  other width.
- **Avatars aren't pre-cached** — only cached once viewed online. Non-Cloudinary
  profile pictures aren't cached.
- **Partial mirrors.** A group visited briefly may be partially synced; the profile
  shows "Partial", but the group page doesn't indicate it.
- **Full syncs aren't resumable.** First mirrors and interrupted syncs restart from
  page 1 (~6–7 s for 1,624 items); only complete groups sync incrementally.
- **`/changes` blind spots.** It relies on item `updated_date`. A write path that
  changes an item's attributes or rankings without bumping it would be missed until
  the next full mirror (deleting a group attribute is handled via meta).
- **Duplicated query logic.** `getLocalItemsDexie` re-implements `getItems()`; the
  parity tests guard it but must be kept in step with server changes.
- **Not yet validated:** Vercel and Coolify (reverse proxy) deployments, installed
  PWA on iOS Safari / Android Chrome, persistence across browser restarts.

---

## 12. Reverting

The feature is additive. To remove it:

- Delete `src/data/local/`, `src/app/api/offline/`, `src/components/Offline/`, the
  offline hooks (`useAutoSync`, `useGroupPageData`, `useConnectivity`,
  `useOfflineIdentity`, `useOfflineLogout`), `OfflineDataSettings`, and
  `src/utils/image-cors.ts`; remove `dexie` and `fake-indexeddb` from `package.json`.
- Revert the try/catch fallbacks in the page RSCs and `AuthInitializer`, and the
  `readOnly` / `onUpdateQuery` props (they default to the online behaviour).
- No Postgres schema changes were made.

**Keep** the service-worker fixes even if offline reads are removed — they fix
pre-existing bugs that left the deployed PWA without a working service worker: the
precache `exclude` list, explicit registration in `PwaInitializer`, the navigation
route, and 5xx handling in `sw.js`. The Serwist worker can stay as the app's PWA
worker; drop the `/api/offline/*` and Cloudinary rules if they're no longer needed.
