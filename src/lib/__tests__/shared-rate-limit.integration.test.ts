import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LocalPostgres, POSTGRES_TEST_ENABLED } from "@/lib/__tests__/helpers/local-postgres";

vi.mock("@/lib/prisma", async () => {
  const { LocalPostgres } = await import("@/lib/__tests__/helpers/local-postgres");
  return { prisma: { $queryRaw: async (query: TemplateStringsArray, ...values: unknown[]) => {
    const connection = new LocalPostgres();
    try {
      const sql = query.map((part, index) => part + (index < values.length
        ? typeof values[index] === "number" ? String(values[index]) : `'${String(values[index]).replaceAll("'", "''")}'` : "")).join("");
      return JSON.parse(await connection.query(`WITH result AS (${sql}) SELECT coalesce(json_agg(result), '[]'::json) FROM result`));
    } finally { await connection.close(); }
  } } };
});
vi.mock("@/lib/server-error", () => ({ reportServerError: vi.fn() }));
import { sharedRateLimit } from "@/lib/shared-rate-limit";

describe.skipIf(!POSTGRES_TEST_ENABLED)("isolated PostgreSQL shared rate limiter", () => {
  let pg: LocalPostgres;
  beforeAll(async () => {
    pg = new LocalPostgres();
    expect(await pg.query("SELECT current_database() || ':' || current_user")).toBe("showle_security_fix:showle_security");
    await pg.query('CREATE TABLE "RateLimitBucket" (key text PRIMARY KEY, count integer NOT NULL, "expiresAt" timestamp(3) NOT NULL)');
  });
  afterAll(async () => { await pg?.close(); });
  it("admits exactly five of twelve requests on independent database connections", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => sharedRateLimit("concurrent", { limit: 5, windowMs: 60000 })));
    expect(results.filter((result) => result.success)).toHaveLength(5);
    expect(results.some((result) => result.unavailable)).toBe(false);
    expect(await pg.query('SELECT max(count) FROM "RateLimitBucket"')).toBe("6");
  }, 20000);
  it("resets expired weighted buckets without losing concurrency protection", async () => {
    expect((await sharedRateLimit("weighted", { limit: 5, windowMs: 60000, cost: 3 })).success).toBe(true);
    expect((await sharedRateLimit("weighted", { limit: 5, windowMs: 60000, cost: 3 })).success).toBe(false);
    await pg.query('UPDATE "RateLimitBucket" SET "expiresAt" = CURRENT_TIMESTAMP - INTERVAL \'1 second\'');
    expect(await sharedRateLimit("weighted", { limit: 5, windowMs: 60000, cost: 3 })).toEqual({ success: true, remaining: 2 });
  });
});
