/* eslint-env serviceworker */
/**
 * Service worker for the offline read-only experience, built by Serwist
 * (`@serwist/next`, see next.config.mjs). See docs/OFFLINE_PLAN.md › Service worker.
 *
 * We write our own navigation handler instead of a stock `NetworkFirst`
 * because `NetworkFirst` only falls back to the cache when the network
 * *throws*. Behind a reverse proxy (Coolify, Vercel, nginx) a server outage
 * usually surfaces as a **502/503 response**, which `NetworkFirst` happily
 * returns — replacing the app with an error page even though a good copy is
 * cached. The handler below treats non-OK responses and slow requests as a
 * failure and serves the cached document instead.
 *
 * Route order matters: the first matching entry in `runtimeCaching` wins.
 */

import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

const DOCUMENTS_CACHE = "documents";
const DOCUMENT_MAX_ENTRIES = 200;
const DOCUMENT_TIMEOUT_MS = 3000;

// Cloudinary images (CldImage, Cloudinary avatars). See OFFLINE_PLAN.md › Images.
// - Only 200s are cached: images load with `crossOrigin`, and an opaque
//   (status 0) response can't satisfy a CORS image request.
// - `ignoreVary`: Cloudinary may send `Vary: Accept` (f_auto); the URL fully
//   identifies the image, so any cached format is fine to serve.
// - v2: drops opaque entries cached before images loaded with CORS; the old
//   cache is deleted on activate below.
const CLOUDINARY_CACHE = "cloudinary-images-v2";

/** Caches from earlier workers that are no longer used. */
const OBSOLETE_CACHES = [
  "cloudinary-images", // pre-v2, held opaque responses
  "start-url", // next-pwa's homepage cache
];

/** Cache API has no TTL/index; evict oldest entries by insertion order. */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i += 1) {
    await cache.delete(keys[i]);
  }
}

/**
 * Network-first for navigations, but:
 *  - falls back to the cached document on network errors, timeouts AND non-OK
 *    responses;
 *  - never caches a redirected or cross-origin response (e.g. the Auth0 login
 *    page reached through a redirect), which would poison the cache for a URL.
 */
async function networkFirstDocument({ request }) {
  const cache = await caches.open(DOCUMENTS_CACHE);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOCUMENT_TIMEOUT_MS);

  try {
    const response = await fetch(request, { signal: controller.signal });

    if (response.ok && !response.redirected) {
      await cache.put(request, response.clone());
      await trimCache(cache, DOCUMENT_MAX_ENTRIES);
      return response;
    }

    // 4xx/5xx: prefer a cached copy over an error page.
    return (await cache.match(request)) ?? response;
  } catch {
    // Offline or timed out. Any cached document beats the browser's offline
    // page: the home page redirects on the client to the last group.
    const fallback =
      (await cache.match(request)) ??
      (await cache.match("/")) ??
      (await caches.match("/"));
    if (fallback) return fallback;
    throw new Error(`No cached document for ${request.url}`);
  } finally {
    clearTimeout(timeout);
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.mode === "navigate" && url.origin === self.location.origin,
      handler: networkFirstDocument,
    },

    // The connectivity probe must never be served from cache, or a stale 200
    // would make the app think the API is up while it is down.
    {
      matcher: ({ url }) => /\/api\/health$/i.test(url.pathname),
      handler: new NetworkOnly(),
    },

    // Sync endpoints must always hit the network; a cached response would make
    // the local mirror silently stale.
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/offline/"),
      handler: new NetworkOnly(),
    },

    {
      matcher: ({ url }) => url.hostname === "res.cloudinary.com",
      handler: new CacheFirst({
        cacheName: CLOUDINARY_CACHE,
        matchOptions: { ignoreVary: true },
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          // Thumbnails are pre-cached for every mirrored item (see
          // src/data/local/warm-images.ts), so this must exceed the item count.
          new ExpirationPlugin({
            maxEntries: 10000,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          }),
        ],
      }),
    },

    /* -------------------------------------------------------------------
     * General-purpose rules (carried over from next-pwa's defaults).
     * ---------------------------------------------------------------- */
    {
      matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:js)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\.(?:css|less)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\.(?:json|xml|csv)$/i,
      handler: new NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ url, request }) =>
        request.method === "GET" &&
        url.origin === self.location.origin &&
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/auth/"),
      handler: new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    // Same-origin, non-API requests — notably App Router RSC payloads for
    // client-side navigation (`?_rsc=`).
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin &&
        !url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ url }) => url.origin !== self.location.origin,
      handler: new NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },
  ],
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(OBSOLETE_CACHES.map((name) => caches.delete(name))),
  );
});

serwist.addEventListeners();
