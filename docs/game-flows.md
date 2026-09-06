# Game flows and deployment

Daily guesses are checked by the server. The browser sends only `type: guess` plus a movie ID, or `type: give-up`. Results, hints, coins and statistics are not trusted from request payloads. Guest games use an HTTP-only `showle-player` cookie; signed-in games use the Clerk user ID. An existing account game wins over browser progress when signing in.

Daily movie details are frozen per date and film in `DailyMovieSnapshot`. Polish text and artwork share the same canonical numeric values as English. Day boundaries use Europe/Warsaw, including daylight-saving changes.

Duels and solo frame practice share one server state machine and the `DuelRoom` table (`mode` distinguishes them). Both players must load the frame before the three-second countdown. Each round then has ten seconds. Correct answers earn 500–1,000 points according to the server's receipt time; an incorrect or late answer earns zero. A round ends after both answers or the deadline, never after just the first correct answer. Match numbers reject delayed requests from a previous rematch. Frame games do not affect daily-game coins, streaks or statistics.

## Database rollout

Before deploying this version, apply these **additive** SQL changes to the same database used by Next.js:

```sh
npx prisma db execute --file prisma/migrations/20260906_daily_snapshots/migration.sql
npx prisma db execute --file prisma/migrations/20260906_frame_modes/migration.sql
npx prisma generate
```

Both scripts are safe to re-run. This existing project has no full baseline migration history, so do not run `prisma migrate reset` or assume these two files constitute a complete schema migration chain. Production requires shared persistent PostgreSQL storage. The existing in-memory rate limiter is per process, not a global multi-instance quota.

## Verification

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
