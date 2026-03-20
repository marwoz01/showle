# Project Overview

## What is Showle?

A daily movie guessing game inspired by Wordle. Users guess the movie of the day by comparing attributes (year, genres, director, budget, rating, etc.) and receive progressively revealing hints. One puzzle per day, shared across all players.

## Product Goal

Build an engaging, polished daily game that movie fans return to every day. Monetization via future Pro tier (unlimited mode, series mode).

## Tech Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Framework      | Next.js 16 (App Router, Turbopack)              |
| Language       | TypeScript (strict mode)                        |
| UI             | React 19, Tailwind CSS v4, Lucide icons         |
| Auth           | Clerk (`@clerk/nextjs`)                         |
| Database       | PostgreSQL on Neon (serverless) via Prisma 7     |
| External API   | TMDB (The Movie Database) for movie data        |
| i18n           | Custom context-based solution (PL + EN)         |
| Deployment     | Vercel                                          |
| Fonts          | Inter (body), Space Grotesk (display)           |

## How to Run

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local
# Fill in: DATABASE_URL, TMDB_API_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

## Current Status

- **Working**: Daily movie mode, user auth (Clerk), stats tracking, streaks, i18n (PL/EN), responsive UI
- **Placeholder**: Series mode, Unlimited mode, Pro subscription
- **Missing**: Error tracking, OG meta tags, rate limiting on public APIs, automated tests
