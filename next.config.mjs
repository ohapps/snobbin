import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for improved error handling
  swcMinify: true, // Enable SWC minification for improved performance
  compiler: {
    removeConsole: false, // Keep logs for debugging
  },
};

const withSerwist = withSerwistInit({
  // Our own worker; see the header comment in sw.js and
  // docs/OFFLINE_PLAN.md › Service worker.
  swSrc: "sw.js",
  swDest: "public/sw.js",
  // The worker only matters in production builds; `next dev` serves none.
  disable: process.env.NODE_ENV !== "production",
  // Registered explicitly in `src/initializers/PwaInitializer.tsx`.
  register: false,
  // Serwist defaults to a full page reload when the browser comes back online.
  // `OfflineReconnect` already re-syncs and soft-refreshes the route instead.
  reloadOnOnline: false,
  // A single non-200 precache entry fails the whole install, leaving the
  // worker `redundant` and offline disabled (verified in a production build).
  // Setting `exclude` replaces Serwist's defaults, so they are repeated here.
  //
  //  - `.map`                    : not emitted to `.next/static` (Serwist default).
  //  - `manifest*.js`            : Serwist default.
  //  - `app-build-manifest.json` : served via the app router, so the auth guard
  //    redirects it (307 → /api/auth/login) instead of returning 200.
  exclude: [/\.map$/, /^manifest.*\.js$/, /app-build-manifest\.json$/],
});

const configWithPWA = withSerwist(nextConfig);

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
