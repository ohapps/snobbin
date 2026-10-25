/* eslint-env serviceworker */
/**
 * Service worker for the offline read-only experience.
 *
 * We use next-pwa's InjectManifest mode (rather than its generated worker)
 * because Workbox's stock `NetworkFirst` only falls back to the cache when the
 * network *throws*. When an app server is behind a reverse proxy (Coolify,
 * Vercel, nginx) a server outage usually surfaces as a **502/503 response**,
 * which `NetworkFirst` happily returns to the browser — replacing the app with
 * an error page even though a perfectly good copy is cached.
 *
 * The navigation handler below treats 5xx (and aborted/slow requests) as a
 * failure and serves the cached document instead. See docs/OFFLINE_PLAN.md §4.
 */

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const DOCUMENTS_CACHE = "documents";
const DOCUMENT_MAX_ENTRIES = 200;
const DOCUMENT_TIMEOUT_MS = 3000;

/**
 * Network-first for navigations, but:
 *  - falls back to the cached document on network errors, timeouts AND 5xx;
 *  - never caches a cross-origin response (e.g. the Auth0 login page reached
 *    through a redirect), which would otherwise poison the cache for a URL.
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
    const cached = await cache.match(request);
    return cached ?? response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fall back to the generic app shell from precache so we don't show
    // the browser's "offline" error page.
    const precache = await caches.open("precache-v1");
    const shell =
      (await precache.match("/offline.html")) ||
      (await precache.match("/index.html")) ||
      (await caches.match("/"));
    if (shell) return shell;
    throw new Error(`No cached document for ${request.url}`);
  } finally {
    clearTimeout(timeout);
  }
}

/** Cache API has no TTL/index; evict oldest entries by insertion order. */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i += 1) {
    await cache.delete(keys[i]);
  }
}

// Must be registered before the generic defaults: first match wins.
registerRoute(
  ({ request, url }) =>
    request.mode === "navigate" && url.origin === self.location.origin,
  networkFirstDocument,
);

// The connectivity probe must never be served from cache, or a stale 200 would
// make the app think the API is up while it is down.
registerRoute(({ url }) => /\/api\/health$/i.test(url.pathname), new NetworkOnly());

// Sync endpoints must always hit the network; a cached page would make the
// local mirror silently stale.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/offline/"),
  new NetworkOnly(),
);

// Cloudinary images (CldImage) — cache-first so thumbnails render offline.
registerRoute(
  ({ url }) => url.hostname === "res.cloudinary.com",
  new CacheFirst({
    cacheName: "cloudinary-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 3000,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  }),
);

/* -------------------------------------------------------------------------
 * next-pwa's default runtime caching, replicated for InjectManifest mode.
 * https://github.com/shadowwalker/next-pwa/blob/master/cache.js
 * ---------------------------------------------------------------------- */

registerRoute(
  /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-font-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-image-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\/_next\/image\?url=.+$/i,
  new StaleWhileRevalidate({
    cacheName: "next-image",
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:mp3|wav|ogg)$/i,
  new CacheFirst({
    cacheName: "static-audio-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:mp4)$/i,
  new CacheFirst({
    cacheName: "static-video-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:js)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-js-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:css|less)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-style-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\/_next\/data\/.+\/.+\.json$/i,
  new StaleWhileRevalidate({
    cacheName: "next-data",
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  /\.(?:json|xml|csv)$/i,
  new NetworkFirst({
    cacheName: "static-data-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    url.origin === self.origin &&
    url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/api/auth/"),
  new NetworkFirst({
    cacheName: "apis",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
  "GET",
);

registerRoute(
  ({ url }) => url.origin === self.origin && !url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "others",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin !== self.origin,
  new NetworkFirst({
    cacheName: "cross-origin",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 }),
    ],
  }),
);
