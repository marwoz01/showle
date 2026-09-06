# Game flows and deployment

Daily guesses are checked by the server. The browser sends only `type: guess` plus a movie ID, or `type: give-up`. Results, hints, coins and statistics are not trusted from request payloads. Guest games use an HTTP-only `showle-player` cookie; signed-in games use the Clerk user ID. An existing account game wins over browser progress when signing in.

Daily movie details are frozen per date and film in `DailyMovieSnapshot`. Polish text and artwork share the same canonical numeric values as English. Day boundaries use Europe/Warsaw, including daylight-saving changes.

Duels and solo frame practice share one server state machine and the `DuelRoom` table (`mode` distinguishes them). Both players confirm readiness before the three-second countdown (later rounds confirm automatically). The server releases the frame and options only when the round starts, never during readiness, countdown or previous-round feedback. Each round has a ten-second server window; image/network latency uses part of that window, and the client fetches at the start rather than waiting for its next poll. Correct answers earn 500–1,000 points according to the server's receipt time; an incorrect or late answer earns zero. A round ends after both answers or the deadline, never after just the first correct answer. Match numbers reject delayed requests from a previous rematch. Frame games do not affect daily-game coins, streaks or statistics.

## Database rollout

Before deploying this version, apply these **additive** SQL changes to the same database used by Next.js:

```sh
npx prisma db execute --file prisma/migrations/20260906_daily_snapshots/migration.sql
npx prisma db execute --file prisma/migrations/20260906_frame_modes/migration.sql
npx prisma generate
```

Both scripts are safe to re-run. This existing project has no full baseline migration history, so do not run `prisma migrate reset` or assume these two files constitute a complete schema migration chain. Production requires shared persistent PostgreSQL storage. The existing in-memory rate limiter is per process, not a global multi-instance quota.

## Verification

### Mobile daily workspace

Below the `lg` breakpoint, the daily game uses one compact workspace with three tabs: guesses, hints and revealed clues. Search, server-confirmed submission feedback and tabs stay below the fixed mobile navigation. Selecting a movie dismisses the mobile keyboard; after confirmation the workspace scrolls into view and selects that guess. Numbered buttons switch older comparisons without stacking the full cards. The three-column clue grid becomes two columns below 360px so long names stay readable.

The revealed tab aggregates only exact, non-empty answers already returned by the server. An accepted receipt requires the selected ID in a response for the same date. Failed, superseded and stale-day requests do not produce a success message. Duplicate selections show the existing attempt number; they do not claim a new attempt. Newly unlocked hints get a badge until opened, and locked hints explain the 2/4/6 thresholds. Desktop cards and the completed-game reveal are preserved. No database migration is needed for this layout change.

Manual regression checks: 320px and phone-sized widths, long titles/genres, six previous guesses, all three tabs, keyboard tab navigation, successful/duplicate/failed submissions, locale changes and desktop layout. Preview fixtures must not save actual daily progress or ship in production. Responsive browser checks do not replace a physical iPhone/Safari keyboard check.

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

With a local server running on port 3010:

```sh
node scripts/smoke-game-flows.mjs
```

The integration script uses isolated random guest/player identities, exercises all six rounds and rematches in both modes, and removes only the test game rows it created. It also checks hidden daily answers, invalid client-reported outcomes, stale dates, duplicate guesses and restored localized results. Never point it at a public deployment.
