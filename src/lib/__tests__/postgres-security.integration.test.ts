import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LocalPostgres, POSTGRES_TEST_ENABLED, postgresTransaction } from "@/lib/__tests__/helpers/local-postgres";

vi.mock("@/lib/prisma", async () => {
  const { postgresTransaction } = await import("@/lib/__tests__/helpers/local-postgres");
  return { prisma: { $transaction: postgresTransaction } };
});
import { reserveRecommendation } from "@/lib/recommend-quota";
import { addRankingItems, moveRankingItem, reorderRankingItems } from "@/lib/ranking-items";

describe.skipIf(!POSTGRES_TEST_ENABLED)("isolated PostgreSQL security integration", () => {
  let pg: LocalPostgres;
  beforeAll(async () => {
    pg = new LocalPostgres();
    expect(await pg.query("SELECT current_database() || ':' || current_user")).toBe("showle_security_fix:showle_security");
    // Deliberately CREATE, never replace an existing schema or user data.
    await pg.query(`CREATE TABLE "DailyUsage" (key text PRIMARY KEY, count integer NOT NULL, date text NOT NULL);
      CREATE TABLE "RankedList" (id text PRIMARY KEY, "userId" text NOT NULL);
      CREATE TABLE "RankedListItem" (id text PRIMARY KEY DEFAULT md5(random()::text), "listId" text REFERENCES "RankedList"(id),
        "tmdbId" integer, position integer, title text DEFAULT '', year integer DEFAULT 0, "posterPath" text DEFAULT '',
        genres text[] DEFAULT '{}', director text DEFAULT '', overview text DEFAULT '', UNIQUE ("listId", "tmdbId"));
      INSERT INTO "RankedList" VALUES ('mine', 'owner'), ('victim-list', 'victim'), ('legacy', 'legacy-owner'), ('cap', 'cap-owner');
      INSERT INTO "RankedListItem" (id, "listId", "tmdbId", position) VALUES ('owned', 'mine', 1, 1), ('foreign', 'victim-list', 2, 1);
      INSERT INTO "RankedListItem" (id, "listId", "tmdbId", position) SELECT 'legacy-' || n, 'legacy', n, n FROM generate_series(1, 1001) n;
      INSERT INTO "RankedListItem" (id, "listId", "tmdbId", position) SELECT 'cap-' || n, 'cap', n, n FROM generate_series(1, 499) n`);
  }, 20000);
  afterAll(async () => { await pg?.close(); });

  it("admits one of eight concurrent reservations under the actual advisory lock", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveRecommendation("same-day", "2026-09-06", 1)));
    expect(results.filter((value) => value === 0)).toHaveLength(1);
    expect(results.filter((value) => value === null)).toHaveLength(7);
    expect(await pg.query('SELECT count FROM "DailyUsage" WHERE key = \'same-day\'')).toBe("1");
  }, 20000);
  it("rolls back mixed foreign reorders, then executes parameterized owned reorders", async () => {
    await expect(reorderRankingItems("mine", "owner", [{ id: "owned", position: 2 }, { id: "foreign", position: 1 }])).rejects.toMatchObject({ status: 404 });
    expect(await pg.query('SELECT position FROM "RankedListItem" WHERE id = \'owned\'')).toBe("1");
    await reorderRankingItems("mine", "owner", [{ id: "owned", position: 2 }]);
    expect(await pg.query('SELECT position FROM "RankedListItem" WHERE id = \'owned\'')).toBe("2");
    expect(await pg.query('SELECT position FROM "RankedListItem" WHERE id = \'foreign\'')).toBe("1");
  });
  it("moves 1001 legacy positions atomically; a quota-denied next move changes nothing", async () => {
    await moveRankingItem("legacy", "legacy-owner", { id: "legacy-1", position: 1001 });
    expect(await pg.query('SELECT position FROM "RankedListItem" WHERE id = \'legacy-1\'')).toBe("1001");
    expect(await pg.query('SELECT count(DISTINCT position) FROM "RankedListItem" WHERE "listId" = \'legacy\'')).toBe("1001");
    await expect(moveRankingItem("legacy", "legacy-owner", { id: "legacy-1", position: 1 })).rejects.toMatchObject({ status: 429 });
    expect(await pg.query('SELECT position FROM "RankedListItem" WHERE id = \'legacy-1\'')).toBe("1001");
  });
  it("validates move ownership and target range before changing any rows", async () => {
    await expect(moveRankingItem("mine", "owner", { id: "foreign", position: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(moveRankingItem("mine", "owner", { id: "owned", position: 2 })).rejects.toMatchObject({ status: 400 });
    expect(await pg.query('SELECT position FROM "RankedListItem" WHERE id = \'foreign\'')).toBe("1");
  });
  it("serializes concurrent additions at the 500-item cap", async () => {
    const movie = (tmdbId: number) => ({ tmdbId, title: "Film", year: 2020, posterPath: "", genres: [], director: "", overview: "" });
    const results = await Promise.allSettled([addRankingItems("cap", "cap-owner", [movie(500)]), addRankingItems("cap", "cap-owner", [movie(501)])]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    expect(await pg.query('SELECT count(*) FROM "RankedListItem" WHERE "listId" = \'cap\'')).toBe("500");
  });
  it("uses independent connections, not an in-memory transaction queue", async () => {
    const pids = await Promise.all([0, 1].map(() => postgresTransaction(async (tx) => tx.$queryRaw`SELECT pg_backend_pid() AS pid`)));
    expect(pids[0][0].pid).not.toBe(pids[1][0].pid);
  });
});
