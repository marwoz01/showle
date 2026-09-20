# Tasks

## Completed locally

- [x] Server-authoritative daily movie game, hints, anonymous/account progress, frozen metadata and transactional completion.
- [x] Frame duels, invitations, rematches and repeatable solo practice.
- [x] History, heatmap, statistics, PL/EN and responsive daily layout.
- [x] Sentry configuration, Open Graph image, robots and sitemap routes.
- [x] Recommendation catalog, preferences, reference films, feedback and relevance checks.
- [x] Collection write confirmation and recoverable errors, including partial add failures.
- [x] Exact batched collection membership lookup and lightweight counters.
- [x] Cancelled stale collection reads and success-based pagination.
- [x] Accessible collection tabs and native review/confirmation/add dialogs.
- [x] Server-side collection body, field, date, score and pagination validation.
- [x] Shared streak calculation for skipped days and transactional freeze consumption.
- [x] Split frame-game and result-screen responsibilities into focused hooks/components.
- [x] GitHub Actions for tests, types, lint and build; bounded Vitest workers.
- [x] Refresh README and architecture/status documentation.
- [x] Personal home page with three picks, persistent favorites/services and optional refinements; existing games preserved.
- [x] Catalog-only default recommendations, shared AI quota, guarded cold metadata imports and honest empty results.
- [x] Account data export/reset, signed Clerk deletion webhook and deferred cleanup queue.
- [x] Shared PostgreSQL request budgets, TMDB deadlines, safe Sentry/error data and bearer-protected health/maintenance routes.
- [x] Native result sharing, guest save/login CTA, settings navigation and storage-blocked locale fallback.
- [x] Gated legal templates and a read-only production configuration/migration/catalog check.

These entries describe source code, not a production deployment. The existing recommendation/watchlist work remains part of the user's working tree.

## Next

- [ ] Complete authenticated and two-player browser regressions against a configured staging environment; test tooling alone does not prove provider-backed flows.
- [ ] Verify deployment-wide rate limits and trusted proxy headers.
- [x] Add a full empty-database baseline, migration-chain/drift CI checks, and a guarded existing-database/restore runbook.
- [ ] Execute and record the restore drill and migration adoption against the operator's actual staging database.
- [x] Centralize site URLs, expose crawler metadata publicly, give public routes distinct metadata, and remove private pages from the sitemap.
- [ ] Confirm anonymous crawler responses and final canonical domain on the deployed service.
- [ ] Verify scheduled catalog refresh and provider/vector coverage in the intended environment.
- [ ] Decide collection search/filter/bulk operations, shared evening choices and shareable rankings in a separate product iteration.
- [ ] Expanded user statistics and product analytics.
- [ ] TV-series mode and any future Pro/payment offering.

## Verification for the personal-home change

- TypeScript, ESLint and the production build passed. Default Vitest: 663 passed, 14 opt-in tests skipped.
- Real isolated PostgreSQL: 8 tests passed across quota/ranking concurrency and shared rate limiter suites. The owned cluster was stopped afterward.
- Full pgvector migration replay/drift checking is configured in CI but has not been executed locally; local PostgreSQL lacks pgvector.
- Browser smoke tests could not complete because Clerk entered a handshake redirect loop in the current local environment, also outside the network sandbox. Verify the Clerk instance keys/origin and rerun against configured staging services. These checks are not recorded as passing.
