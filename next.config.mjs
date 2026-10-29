import withPWAInit from "next-pwa";
import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for improved error handling
  swcMinify: true, // Enable SWC minification for improved performance
  compiler: {
    removeConsole: process.env.NODE_ENV !== "development", // Remove console.log in production
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // `next-pwa`'s auto-register injects into the Pages Router `main.js` entry,
  // which the App Router never loads, so it silently does nothing. We register
  // the worker ourselves in `src/initializers/PwaInitializer.tsx` instead.
  register: false,
  skipWaiting: true,
  // Several precache manifest entries 404/redirect in production, and a single
  // non-200 entry makes the Workbox install fail — leaving the service worker
  // `redundant` and disabling offline entirely (verified in a production build).
  //
  //  - `.js.map`                 : listed by next-pwa but not emitted to `.next/static`.
  //  - `app-build-manifest.json` : served via the app router, so the auth guard
  //    redirects it (307 → /api/auth/login) instead of returning 200.
  //
  // `buildExcludes` is passed through to Workbox's `exclude`, which tests each
  // entry's asset name.
  buildExcludes: [/\.map$/, /app-build-manifest\.json$/],
  // Use our own worker (InjectManifest) instead of next-pwa's generated one.
  //
  // Workbox's stock `NetworkFirst` returns 4xx/5xx responses as-is, so a server
  // outage behind a reverse proxy (502/503) would replace the cached app with an
  // error page. `sw.js` implements a navigation handler that treats 5xx as a
  // failure and serves the cached document. It also keeps the runtime caching
  // rules that used to live here. See docs/OFFLINE_PLAN.md §4.
  swSrc: "sw.js",
});

const configWithPWA = withPWA(nextConfig);

export default withSentryConfig(configWithPWA, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "open-house-apps",
  project: "snobbin-web",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
BUILD_ID=1793240486
