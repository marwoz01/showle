# Project overview

Showle combines a daily movie guessing game, frame duels, solo frame practice, a personal movie collection with rankings, and movie recommendations. The interface supports Polish and English and uses a dark theme.

## Product direction

Help someone quickly decide what to watch: choose favorite movies and Polish streaming services once, then open the home page for three personal picks. Reactions and watched ratings inform subsequent choices. Mood, runtime and reference-film refinements remain optional. Existing games are available below the personal shelf; no Pro upsell or payment flow is offered.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript.
- Tailwind CSS v4, Inter and Space Grotesk.
- Clerk authentication.
- PostgreSQL on Neon, Prisma 7, pgvector for the recommendation catalog.
- TMDB metadata, bounded AI interpretation/embedding/relevance requests.
- Existing GSAP and Motion icon adapters, including reduced-motion support.
- Sentry instrumentation, Vitest, GitHub Actions; Vercel deployment.

## Implemented

- Server-validated daily guesses, hints and results, Warsaw day boundaries, frozen daily metadata.
- Anonymous progress using an HTTP-only player cookie; account progress and transactional rewards.
- Multiplayer frame duels, invitations, synchronized rounds, rematches and solo practice.
- Game history, activity heatmap, statistics and streak calculations.
- Watched/watchlist collections, ratings, reviews and ordered rankings.
- Saved account preferences and browser-local guest preferences, three personal picks, reference films, feedback and watchlist-only selection.
- Default personal picks and runtime-only filtering use the catalog without spending AI quota. Explicit descriptions/reference-film searches use bounded provider requests.
- Account data export/reset, verified Clerk deletion webhook and deferred deletion cleanup.
- Open Graph image, robots and sitemap routes.
- Bounded API inputs, atomic shared PostgreSQL request limits in production, trusted proxy parsing and protected operations endpoints.
- Unit, mocked API and render tests; opt-in database/provider integration tests.

The game server is authoritative. localStorage only stores a small progress summary and supports migration of legacy anonymous progress; it does not enable offline gameplay.

## Development

See [README](../README.md) for setup and checks. See [tasks](tasks.md) for remaining scope and [game flows](game-flows.md) / [recommendations](recommendations.md) for deployment details. Do not infer deployed database or provider configuration from the presence of local source files.
