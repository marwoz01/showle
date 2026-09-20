import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// Environment must be injected by the operator; never implicitly select a local database.
const failures = [];
const requireValue = (name) => {
  const value = process.env[name]?.trim();
  if (!value || /^(your-|.*\.\.\.$)/.test(value)) failures.push(`Configure ${name}`);
  return value;
};
const required = ["DATABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SIGNING_SECRET",
  "TMDB_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY", "NEXT_PUBLIC_SENTRY_DSN", "SHOWLE_DATA_CONTROLLER"];
required.forEach(requireValue);
const email = requireValue("SHOWLE_CONTACT_EMAIL");
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) failures.push("Use a valid SHOWLE_CONTACT_EMAIL");
if (process.env.SHOWLE_LEGAL_READY !== "true") failures.push("Review and approve legal pages, then set SHOWLE_LEGAL_READY=true");
if ((requireValue("OPS_SECRET")?.length ?? 0) < 32) failures.push("OPS_SECRET must have at least 32 random characters");
if (process.env.VERCEL !== "1" && !["vercel", "forwarded"].includes(process.env.TRUSTED_PROXY ?? "")) failures.push("Configure a trusted, header-replacing proxy");
let origin;
try {
  origin = new URL(requireValue("NEXT_PUBLIC_SITE_URL") ?? "");
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
    || ["localhost", "127.0.0.1", "example.com"].includes(origin.hostname)) throw new Error("origin");
} catch { failures.push("NEXT_PUBLIC_SITE_URL must be the final HTTPS origin"); }

if (!failures.length && !process.argv.includes("--config-only")) {
  let client;
  try {
    const response = await fetch(new URL("/api/health", origin), {
      headers: { Authorization: `Bearer ${process.env.OPS_SECRET}` },
      redirect: "error", signal: AbortSignal.timeout(10000),
    });
    const health = await response.json();
    if (!response.ok || health.status !== "ok") failures.push("Deployed /api/health is not ready");
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
    const migrationsRoot = path.join(import.meta.dirname, "..", "prisma", "migrations");
    const expected = (await readdir(migrationsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const [applied, coverage] = await client.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`;
      const migrations = await tx.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`;
      const catalog = await tx.$queryRaw`SELECT COUNT(*)::int AS total, COUNT(embedding)::int AS embedded,
        COUNT(*) FILTER (WHERE "providersUpdatedAt" IS NULL OR "providersUpdatedAt" < NOW() - INTERVAL '8 days')::int AS stale
        FROM "RecommendationMovie"`;
      return [migrations, catalog[0]];
    }, { maxWait: 3000, timeout: 12000 });
    for (const name of expected) {
      const migration = applied.find((row) => row.migration_name === name && row.finished_at && !row.rolled_back_at);
      const sql = await readFile(path.join(migrationsRoot, name, "migration.sql")), text = sql.toString("utf8");
      const checksums = [sql, text.replaceAll("\r\n", "\n"), text.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n")]
        .map((content) => createHash("sha256").update(content).digest("hex"));
      if (!migration) failures.push(`Migration not applied: ${name}`);
      else if (!checksums.includes(migration.checksum)) failures.push(`Migration checksum differs: ${name}`);
    }
    if (applied.some((row) => !row.finished_at && !row.rolled_back_at)) failures.push("Resolve failed migrations before deployment");
    if (!coverage?.total || coverage.embedded !== coverage.total || coverage.stale > 0) failures.push("Recommendation catalog needs complete vectors and provider data refreshed within 8 days");
  } catch { failures.push("Read-only deployment check failed: verify connectivity, health authentication, migration history and catalog schema"); }
  finally { await client?.$disconnect(); }
}
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  process.stdout.write(process.argv.includes("--config-only") ? "Configuration checks passed; deployed services were not checked.\n" : "Configuration, health, migrations and catalog checks passed.\n");
}
