# Technical Decisions

## Auth: Clerk instead of NextAuth

- **Decision**: Use Clerk for authentication
- **Why**: NextAuth v5 was in beta with instability risks. Clerk provides production-ready auth with email verification, password reset, rate limiting, and social login out of the box. Eliminates ~400 lines of custom auth code.
- **Alternatives**: NextAuth v5 (beta, more control but more maintenance), Supabase Auth, Lucia Auth

## Database: Neon PostgreSQL + Prisma

- **Decision**: Serverless PostgreSQL on Neon with Prisma ORM
- **Why**: Neon auto-scales to zero (cost-effective for hobby project), Prisma provides type-safe queries and migrations. `@prisma/adapter-neon` optimizes for serverless connection pooling.
- **Alternatives**: Supabase (heavier), PlanetScale (MySQL), SQLite/Turso

## No User model in database

- **Decision**: Store only `GameResult` and `UserStats` in Prisma, reference users by Clerk `userId` string
- **Why**: Clerk owns user data (email, name, avatar). Duplicating it creates sync issues. Simple string foreign key is sufficient.
- **Alternatives**: Mirror user data via webhook (`user.created`), full User model with Clerk sync

## localStorage-first game state

- **Decision**: Primary game persistence is localStorage, with optional server sync for logged-in users
- **Why**: Game must work for anonymous users. Server sync is a bonus for cross-device play and stats. Fire-and-forget pattern means network failures don't break gameplay.
- **Alternatives**: Server-only state (requires login), IndexedDB (overkill)

## Static movie pool (eligible-movies.json)

- **Decision**: Pre-curated list of 4941 TMDB movie IDs stored as static JSON
- **Why**: Ensures every daily movie is well-known, has complete data, and avoids runtime TMDB filtering. Deterministic selection from a fixed pool means all servers agree on today's movie.
- **Alternatives**: Dynamic TMDB queries with popularity filters (inconsistent results, API dependency)

## Deterministic daily selection via date hashing

- **Decision**: Hash the date string to select the daily movie index
- **Why**: Pure function — no database, no random seed, no coordination between servers. Same date always produces same movie. 90-day sliding window prevents short-term repeats.
- **Alternatives**: Store daily picks in database (adds write dependency), random with seed

## 7 attempts with hints every 2nd guess

- **Decision**: Max 7 attempts, hints revealed at attempts 2, 4, 6
- **Why**: 7 attempts is strict enough to feel challenging but generous enough to be solvable. Progressive hints prevent frustration — genres first (broad), director second (narrowing), tagline/overview last (near-giveaway).
- **Alternatives**: 10 attempts (too easy), 5 attempts (too hard without hints)

## Custom i18n instead of next-intl

- **Decision**: Custom React context with typed translation objects
- **Why**: Only 2 languages (PL, EN), no routing needed. Type-safe translations with function interpolation (`wonMessage(title, attempts)`). Under 100 lines of infrastructure.
- **Alternatives**: next-intl (heavier, URL-based routing), react-i18next (overkill for 2 languages)

## Warsaw timezone for daily reset

- **Decision**: All daily logic uses `Europe/Warsaw` timezone
- **Why**: Primary audience is Polish. Midnight reset in Warsaw time ensures consistent experience for target users.
- **Alternatives**: UTC (confusing reset time for users), per-user timezone (complex)

## Tailwind CSS v4 with inline theme

- **Decision**: CSS custom properties defined in `globals.css` via `@theme inline`, consumed by Tailwind utility classes
- **Why**: Single source of truth for colors. Easy to reference in both Tailwind classes and raw CSS. No tailwind.config.js needed in v4.
- **Alternatives**: tailwind.config.js theme (v3 pattern), CSS modules, styled-components
