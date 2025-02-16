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

- [ ] Load Brewgene data into database
- [ ] Add default sort to items screen
- [ ] Fix ability to add/edit attributes before saving
- [ ] Add created/updated dates to ranking item tables to track recent items
- [ ] Add loading screens
- [ ] Add logo
- [ ] Add email functionality
- [ ] Add websocket events for real-time updates

## Schema

![DB Schema](/docs/QuickDBD-export.png)
