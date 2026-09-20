# Architecture

## Application areas

- `src/app/play/movie`: daily game, driven by `useGame`, `daily-api` and `daily-game`.
- `src/app/play/duel` and `play/practice`: a shared frame game engine; `useFrameRoom` owns requests and restoration, `useFramePolling` owns polling and clock updates, and `FrameRound`, `FrameAnswers` and `FrameResults` render the stages.
- `src/app/collection`: account-only watched/watchlist collections and rankings.
- `src/app/recommend`: bounded recommendation pipeline over `RecommendationMovie`.
- `src/app/history` and `stats`: completed daily games and account aggregates.

## Daily game

The browser sends a movie ID or a give-up action. The server chooses the daily answer, checks guesses against frozen `DailyMovieSnapshot` metadata, and returns only the clues currently available. It never trusts a client-supplied outcome or reward.

Guest identity comes from an HTTP-only cookie; authenticated identity comes from Clerk. Guest progress can be adopted only when the account has no game for the day. Completion updates results, statistics, wallet and transaction history under a per-player PostgreSQL advisory lock.

`resolveStreak` is the shared calculation for gaps in play. Read endpoints project the current streak and remaining freezes without writing. A completed daily game or freeze purchase persists missed-day consumption under the same player lock. Calendar calculations use Europe/Warsaw date keys.

The browser's localStorage progress summary is an optimization for the home card, not the source of truth.

## Collection

`CollectionContent` derives the selected tab from the URL. Category/sort changes mount a fresh `CollectionMovies` controller; reads use AbortController and page numbers advance only after successful responses.

Writes are confirmed before changing the list. A failed review keeps the dialog and text open; failed deletions keep the film. Mutations rebase pagination from the first page. The add dialog retains unsaved selections after partial failure.

`CollectionProvider` owns a separate status store per account. Mounted save buttons batch exact TMDB-ID lookups through `/api/collection/status` (up to 50 IDs), independent of collection pagination. Version checks prevent old lookup responses from overwriting a confirmed save. Account-tagged change events update status badges; `/api/collection/summary` returns counts without downloading movie lists.

Create/patch bodies are limited to 16 KiB and validated by `collection-input`; reviews are limited to 1000 characters on both client and server. Ownership is checked in database predicates. Create/update use a per-account collection lock; delete is a single owner-scoped statement.

Collection modals use native modal dialogs with focus containment, Escape and focus restoration. Collection tabs retain phone labels and use manual keyboard activation.

## Result presentation

`ResultScreen` composes hero, details, trailer and footer components. `useResultMedia` handles optional gallery/trailer data, and `useResultCelebration` scopes GSAP to the result container and cleans up animations. Optional media failures do not prevent viewing a completed result.

## Other subsystems

See [recommendations](recommendations.md) for catalog search, feedback and AI budgets, and [game flows](game-flows.md) for frame synchronization and safe SQL deployment.

Clerk owns account identity; application tables store only their Clerk user ID reference. Request limiters are process-local; recommendation daily quotas use persistent transactional storage. Local limiting is not a deployment-wide quota.

## Verification

Vitest covers pure logic, mocked routes and rendered markup. Integration suites using PostgreSQL or live providers are opt-in. GitHub Actions checks tests, types, lint and build for PRs and master pushes; the scheduled recommendation refresh is separate and explicitly gated.
