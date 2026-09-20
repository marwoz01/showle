# Production deployment and recovery

This is an operator runbook, not evidence that a deployment is ready. Never run migration or restore commands against an implicitly loaded database. Use a dedicated staging database first, and verify the hostname, database and user from your provider dashboard without sharing credentials in logs.

## Configuration and release gates

Use Node.js 22, separate Clerk development/production applications and separate PostgreSQL databases. Set the entries in `.env.example` through the deployment secret manager. `NEXT_PUBLIC_SITE_URL` must be the final HTTPS origin before building; it controls canonical URLs, sitemap and sharing metadata. Cookie-selected PL/EN pages share canonical URLs; independent language URLs are not implemented.

Set `SHOWLE_DATA_CONTROLLER` to the actual operator identity and `SHOWLE_CONTACT_EMAIL` to a monitored address. Review the privacy/terms text against the actual vendors, purposes, retention, backups and account deletion process before setting `SHOWLE_LEGAL_READY=true`. Without those values, legal pages return 404 and their footer links stay hidden. Configure the verified Clerk `user.deleted` webhook at `/api/webhooks/clerk` with `CLERK_WEBHOOK_SIGNING_SECRET`, and test retries on staging. These are external configuration gates, not placeholders to bypass.

Production uses PostgreSQL request limits. On Vercel, trusted proxy detection is automatic. Elsewhere, use `TRUSTED_PROXY=forwarded` only when the origin is accessible solely through a proxy that replaces client-supplied `X-Forwarded-For` with one verified address. Set `RATE_LIMIT_BACKEND=postgres` to exercise this behavior in development. A variable alone does not secure the network.

Generate `OPS_SECRET` with at least 32 random characters. Keep it server-only; configure monitoring to GET `/api/health` with `Authorization: Bearer <secret>`. Verify failure alert delivery, not just the presence of a Sentry DSN. Define response owner and escalation channel in the deployment platform.

Schedule authenticated POST `/api/maintenance` for bounded cleanup and pending account-deletion retries. It changes retained application data according to the server's maintenance policy; first exercise it on staging and monitor completion/failures. Both operations endpoints bypass Clerk middleware and enforce their own bearer token. Do not expose the token in URLs or browser code.

Inject the intended environment, then run `node scripts/check-production.mjs --config-only`. The full `npm run production:check` performs only reads: deployed health, local migration checksum comparison against database history, and recommendation vector/provider coverage. It does not load `.env` files, migrate, seed, delete, or prove that backups and external provider permissions work. `npm run recommendations:check` separately checks the configured model and catalog; its catalog helper does load local environment files, so use an explicitly selected environment.

Run lint, typecheck, unit/API tests and production build. CI additionally creates an ephemeral pgvector PostgreSQL database, replays all migrations and checks schema drift. Its concurrency tests use an independent loopback database and real PostgreSQL locks; mocked Prisma/API tests do not replace these checks. Browser checks and authenticated/two-player smoke flows require configured staging services; do not claim that placeholder Clerk credentials prove login works.

`scripts/browser-smoke.mjs` exercises guest onboarding, persisted preferences, reactions, refinements, errors and small screens against a local server. It intercepts application APIs and does not verify real database/provider responses or authenticated writes. Use an already installed Playwright package (`SHOWLE_PLAYWRIGHT_PACKAGE` can point to it), optionally set `SHOWLE_SMOKE_CHROMIUM` to an installed Chromium executable, and run `node scripts/browser-smoke.mjs`. The default URL is `http://127.0.0.1:3017`; only loopback URLs are accepted. Start the server with an explicitly isolated/unreachable test `DATABASE_URL`, since the script is not a general-purpose production test runner. A Clerk handshake redirect loop currently prevents these checks from completing locally; correct the configured instance/origin before counting them as passing.

On Windows with PostgreSQL already installed, `scripts/test-local-postgres.ps1` creates a new isolated loopback cluster on port 55439, runs the two PostgreSQL concurrency suites and stops only that verified cluster. It refuses an occupied port and retains diagnostics in ignored `test-results/`. It does not provide pgvector or replace full migration-chain checks.

## New empty database

`20260905_baseline` creates the original tables and installs the `vector` extension before vector columns. It intentionally does not use `CREATE TABLE IF NOT EXISTS`: an accidental replay on populated tables should fail instead of hiding drift. The existing `20260906_*` patches remain unchanged and run after it. Later migrations add settings, shared limits and other new models.

1. Create an empty staging database with pgvector support and a role allowed to install the extension (or have the provider install it first).
2. Inject its URL as `DATABASE_URL`. Prisma CLI may also read `.env`; an explicitly supplied environment value takes precedence. Verify the target using a direct PostgreSQL client: `SELECT current_database(), current_user, inet_server_addr();`.
3. Run `npx prisma migrate deploy`, then `npx prisma migrate status`.
4. Run `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`. Exit code 0 means no represented schema difference, 2 means drift and 1 means a tool error. This does not compare every PostgreSQL object or prove data integrity.
5. Run `npx prisma generate`, refresh the frame/higher-lower and recommendation catalogs as needed, and complete staging smoke tests. Confirm deployment health before switching traffic.

Never use `prisma migrate reset`, `db push --accept-data-loss`, or a restore over the live database as a deployment shortcut.

## Existing database without this baseline

Do not run the new baseline SQL on existing tables. Before `migrate deploy`, restore a recent backup into a new staging database and audit the legacy schema and migration history there. Keep the originals and all historical migration SQL unchanged.

1. Record the deployed application version, database schema, extension versions, migration history and table row counts. Verify that the backup can be restored into a new database.
2. On the restored copy, compare every table, column, default, index and foreign key in `20260905_baseline/migration.sql` with the legacy schema. Inspect data assumptions, including duplicate compound keys. Existing `20260906_*` tables/columns are expected additions, not proof the baseline is present.
3. Repair unexpected differences with a separately reviewed forward migration. Do not record a migration as applied merely to silence an error.
4. Only after that comparison passes, record `npx prisma migrate resolve --applied 20260905_baseline` on the selected restored copy. This writes migration history but does not execute the baseline SQL.
5. If a historical `20260906_*` migration was applied manually and has no history row, inspect its complete DDL and data backfill before recording that exact migration with `migrate resolve --applied <name>`. Otherwise let `migrate deploy` execute it. Do not blanket-mark all migrations as applied.
6. Apply remaining migrations and run the schema diff, catalog checks and authenticated game/account smoke flows on the restored copy. Review any unexpected data movement.
7. Repeat the reviewed, recorded process on the live database during the planned release window, after a fresh backup. Retain the change log and rollback decision owner.

## Restore drill and rollback

Select a recovery point and provision a **new** database; never target the current live database. Restore using the provider's branch/restore mechanism or `pg_restore` with a directly verified target. Avoid `--clean` against a shared database. Compare row counts and sample game history, rankings, watchlist, recommendation preferences and account ownership. A backup file existing is not a successful restore test.

Reapply account deletion requests since the backup before allowing user traffic; restored data must not silently resurrect deleted accounts. Validate legal retention and provider-specific backup behavior. Run migrations and smoke tests against the restored database, measure actual recovery time and record the recoverable data window. Agree operational RTO/RPO targets before launch; no target is assumed here.

For an application-only regression, roll back to the known compatible application release. Database migrations are forward-only; use a reviewed corrective migration or a verified restored database when needed. Check backward compatibility before rolling application code back across schema changes. Switch connection configuration/traffic only after validation.

## Providers and commercialization

The `/credits` page and footer identify TMDB and JustWatch. The [TMDB FAQ](https://developer.themoviedb.org/docs/faq) describes attribution and commercial licensing; obtain the appropriate commercial agreement and display an approved TMDB logo before commercial launch. A notice alone is not a license for images. Verify rights and use conditions for the actual movie frames, posters and trailers. [TMDB watch-provider documentation](https://developer.themoviedb.org/reference/movie-watch-providers) requires JustWatch attribution; check the current conditions for your distribution model.

Enable and verify the scheduled catalog-refresh workflow in the actual environment, then check vector coverage and Polish provider freshness. Set provider budget alerts and test outages/timeouts. Payment collection, commercial licensing, provider accounts, DNS, customer support operations and external backup/monitoring configuration require the operator's real accounts and are not provisioned by this repository.
