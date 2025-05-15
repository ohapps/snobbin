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

- Convert to mobile app
  - Capacitor
  - React Native - webview
  - native Android - webview
  - native ios - webview
- Convert to local first with offline support
- Add auto select on filling out attributes
- Auto hide the group summary on mobile
- Add user management
- Make header sticky
- Add group summary by attribute
- Show rankings per user in group summary
- Add global error page
- Add not found page
- Add ability to upload profile picture
- Add ability to upload snob group picture
- Add email functionality
- Add public groups
- Add tests
- Add logging library
- Implement data loading pattern for pagination query
- Add websocket events for real-time updates
- Add Sentry
- Add Google Analytics
- Investigage using untappd API for quicker search

## Schema

![DB Schema](/docs/QuickDBD-export.png)
