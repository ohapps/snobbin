# Snobbin

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Drizzle

Create migration

```bash
npx drizzle-kit generate
```

Run migration

```bash
npx drizzle-kit migrate
```

## Tasks

- add slider to select rating instead of star
- Add public groups
- Add tests
- Add logging library
- Setup Github pipeline
- Add offline support via PWA
- Setup AI pull request reviews
- Implement data loading pattern for pagination query
- Add websocket events for real-time updates
- Review types to see if we can consolidate Zod, Drizzle and other types
- Add Auth0 production keys
- Add Sentry
- Add Google Analytics
- Investigage using untappd API for quicker search
- use AI to scrape the web for item information

## Schema

![DB Schema](/docs/QuickDBD-export.png)

## Database Keepalive

To prevent Supabase from pausing the project due to inactivity, an API route is available at `/api/keepalive`.

### Setting up Vercel Cron

1.  **Configure `vercel.json`**: I have already created a `vercel.json` file in the root directory that schedules this job to run daily at midnight.
2.  **Add `CRON_SECRET` Environment Variable**:
    - Go to your project settings in the Vercel Dashboard.
    - Add a new Environment Variable named `CRON_SECRET`.
    - You can generate a random string for this value.
    - Vercel will automatically include this secret in the `Authorization` header when it triggers the cron job.
3.  **Deploy**: Once you push these changes to Vercel, the cron job will be active.

The route performs a simple `SELECT 1` query to keep the database active and requires the `Authorization` header to match `Bearer ${process.env.CRON_SECRET}` for security.
