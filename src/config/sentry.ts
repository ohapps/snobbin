/**
 * Whether Sentry reports errors, traces and replays.
 *
 * Off for `next dev`, and off for a local production build (`npm run build &&
 * npm start`) when `.env.local` sets `NEXT_PUBLIC_SENTRY_DISABLED=true`.
 * Deployed builds don't have `.env.local`, so they keep reporting.
 *
 * `NEXT_PUBLIC_` so the value is also inlined into the browser bundle (it is
 * read at build time there, and at runtime on the server).
 */
export const SENTRY_ENABLED =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_SENTRY_DISABLED !== "true";
