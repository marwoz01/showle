# Showle

Three personal movie picks based on saved favorites, streaming services and reactions, with a movie collection, daily movie guessing, frame duels and solo practice. Available in Polish and English.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS, Clerk, Prisma and Neon PostgreSQL. Movie metadata comes from TMDB. Recommendations use a separate searchable catalog.

## Local setup

Use Node.js 22 and npm.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure your own development services.
3. Generate the Prisma client with `npx prisma generate` (also runs after installation).
4. Prepare a dedicated development database. See [game deployment](docs/game-flows.md) and [recommendation deployment](docs/recommendations.md) before applying SQL.
5. Run `npm run dev`.

The migration chain includes a full baseline for empty PostgreSQL databases with pgvector. Existing databases must be audited and baselined before deploying the chain; follow [production and recovery](docs/production.md). Never reset an existing database to adopt migration history.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Default Vitest tests mock the application database and providers. PostgreSQL and live recommendation integration suites require explicit opt-in configuration; see their documentation. Two workers keep the suite stable on machines with other development processes running.

GitHub Actions runs these checks on pull requests and pushes to master. The unit/build job uses placeholder credentials. A separate job uses ephemeral pgvector PostgreSQL to replay the migration chain, detect schema drift and check real concurrent transactions. It never uses production secrets. The separate catalog refresh workflow remains opt-in.

## Documentation

- [Project and scope](docs/project.md)
- [Architecture](docs/architecture.md)
- [Engineering rules](docs/rules.md)
- [Decisions](docs/decisions.md)
- [Completed work and next tasks](docs/tasks.md)
- [Daily and frame game flows](docs/game-flows.md)
- [Recommendation catalog and operations](docs/recommendations.md)
- [Production configuration, migration baseline and restore drill](docs/production.md)
