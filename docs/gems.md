# Blue gems

Gems use the existing `UserWallet.balance` and `CoinTransaction` ledger. Previously earned balances are preserved. Internal coin model/route names remain compatible. The current UI supports earning and viewing gems; no new spending shop is exposed.

## Rewards

| Achievement | Gems |
| --- | ---: |
| Solve Daily Movie | 50, 40, 30, 25, 20, 15 for attempts 1-6; 10 after that |
| Finish Daily Movie without solving it, after at least one guess | 5 |
| Daily streak 5 / 10 / 25 / 50 / 100 | 25 / 50 / 100 / 200 / 500 bonus |
| First watched film badge | 25 |
| 50 watched films badge | 100 |
| First Daily Movie win badge | 25 |
| Seven-win daily streak badge | 100 |
| Higher or lower 10 badge | 100 |
| 10 / 25 / 100 rated watched films | 25 / 60 / 150 |
| Higher or lower record 25 / 50 | 75 / 150 |

Daily rewards are credited once per authenticated account and day within the existing game transaction. Zero-guess surrender and anonymous play earn nothing. Existing server verification of guesses and signed Higher or lower records remains authoritative. The daily win reward includes any streak bonus in the same receipt.

Badges and collection/record milestones each pay once per account. `GET /api/user/wallet` reconciles eligibility from owned database records, including achievements already reached before release. Removing and re-adding films or repeating a milestone cannot grant its reward again. Lowering current progress does not remove previously earned gems. An explicit full Showle account-data reset removes the balance and ledger along with progress.

## Consistency and UI

The authenticated wallet endpoint returns a private, uncached balance, recent 12 positive receipts and the keys of credited one-time rewards. It does not accept a client-supplied amount or eligibility. The `(userId, rewardKey)` unique index prevents duplicate credits; nullable keys preserve older ledger entries. Reconciliation, daily rewards and account reset acquire the profile lock followed by the existing player/wallet lock.

A shared client provider updates desktop/mobile balance, the profile gem panel and badge reward labels. It refreshes on navigation, focus, successful collection changes, completed daily games and saved Higher or lower records. Account transitions cancel requests and clear previous account data. The daily result shows a positive receipt from the server for that game's date.

## Deployment and validation

Apply `prisma/migrations/20260923_gem_rewards/migration.sql` before deploying the new wallet code, then generate Prisma. It adds only a nullable reward key and two indexes. This migration was applied to the configured application database on 2026-09-23; the column and indexes were verified, and existing balances and ledger entries were preserved.

Tests cover authenticated reads, server-derived thresholds, repeat requests, daily win/loss/guest behavior, concurrent reconciliation and daily completion, legacy balance preservation and reset races. Real PostgreSQL cases extend the existing opt-in profile integration suite. Browser checks cover wallet refresh, account isolation, retry, profile links and narrow mobile layouts.
