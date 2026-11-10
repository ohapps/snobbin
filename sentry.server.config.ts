// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { SENTRY_ENABLED } from "@/config/sentry";

Sentry.init({
  // Off when running locally; see src/config/sentry.ts.
  enabled: SENTRY_ENABLED,

  // An expired or missing login session is expected, not a bug; the app sends
  // the user to log in. See NoSessionError in get-current-user.ts.
  ignoreErrors: ["No session found for current user"],

  dsn: "https://1f0cbaed963eb1c3aaa9f6cdc04810df@o348873.ingest.us.sentry.io/4512127734448128",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
