import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HigherLowerRun } from "@/lib/higher-lower";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn(), query: vi.fn(), limit: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { higherLowerRecord: { findUnique: mocks.findUnique }, $queryRaw: mocks.query } }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.limit }));
vi.mock("@/lib/higher-lower-catalog", () => ({
  getHigherLowerCatalog: () => ({ version: "records-test", movies: [
    { id: 1, titles: { pl: "Jeden", en: "One" }, year: 2000, backdropPath: "/a.jpg", voteCount: 1000 },
    { id: 2, titles: { pl: "Dwa", en: "Two" }, year: 2010, backdropPath: "/b.jpg", voteCount: 1000 },
  ] }),
}));

import { GET, POST } from "@/app/api/user/higher-lower-record/route";
import { sealHigherLowerRun } from "@/lib/higher-lower-session";

const now = Date.parse("2026-09-22T12:00:00Z");
const records = new Map<string, number>();
const run = (score: number, patch: Partial<HigherLowerRun> = {}): HigherLowerRun => ({
  version: 2, catalogVersion: "records-test", expiresAt: now + 60_000,
  round: score + 1, score, status: "guessing", outcome: null,
  leftId: 1, rightId: 2, seenIds: [1, 2], recentIds: [1, 2], ...patch,
});
const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/user/higher-lower-record", {
  method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("HIGHER_LOWER_SECRET", "record-test-secret");
  records.clear();
  mocks.auth.mockResolvedValue({ userId: "user_a" });
  mocks.limit.mockReturnValue({ success: true });
  mocks.findUnique.mockImplementation(async ({ where }: { where: { userId: string } }) => {
    const bestScore = records.get(where.userId);
    return bestScore === undefined ? null : { bestScore };
  });
  mocks.query.mockImplementation(async (parts: TemplateStringsArray, userId: string, score: number) => {
    expect(parts.join("?")).toContain('GREATEST("HigherLowerRecord"."bestScore", EXCLUDED."bestScore")');
    records.set(userId, Math.max(records.get(userId) ?? 0, score));
    return [{ bestScore: records.get(userId) }];
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("account higher/lower record", () => {
  it("loads zero for a new account and stores only the verified score monotonically", async () => {
    expect(await (await GET()).json()).toEqual({ bestScore: 0 });
    for (const [score, expected] of [[6, 6], [2, 6], [9, 9], [9, 9]]) {
      const response = await POST(request({ token: sealHigherLowerRun(run(score)) }));
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(await response.json()).toEqual({ bestScore: expected });
    }
    expect(await (await GET()).json()).toEqual({ bestScore: 9 });
    mocks.auth.mockResolvedValue({ userId: "user_b" });
    expect(await (await GET()).json()).toEqual({ bestScore: 0 });
    await POST(request({ token: sealHigherLowerRun(run(3)) }));
    expect(records.get("user_a")).toBe(9);
    expect(records.get("user_b")).toBe(3);
  });

  it("requires authentication for reads and writes without accessing storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await GET()).status).toBe(401);
    expect((await POST(request({ token: sealHigherLowerRun(run(5)) }))).status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects client scores, alternate accounts, oversized and malformed payloads", async () => {
    const token = sealHigherLowerRun(run(5));
    for (const body of [{ bestScore: 1000 }, { token, score: 1000 }, { token, userId: "user_b" }, { token: "x".repeat(34_001) }, null]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect((await POST(new Request("http://localhost/api/user/higher-lower-record", { method: "POST", body: "{" }))).status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects tampered, expired, incompatible and inconsistent signed runs", async () => {
    const bytes = Buffer.from(sealHigherLowerRun(run(5)), "base64url");
    bytes[28] ^= 1;
    for (const token of [bytes.toString("base64url"), sealHigherLowerRun(run(5, { expiresAt: now })),
      sealHigherLowerRun(run(5, { catalogVersion: "old" })), sealHigherLowerRun(run(500, { round: 1 }))]) {
      const response = await POST(request({ token }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "invalid_session" });
    }
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects foreign origins, limits writes and tolerates storage failure independently of gameplay", async () => {
    const body = { token: sealHigherLowerRun(run(4)) };
    expect((await POST(request(body, "https://unrelated.example"))).status).toBe(403);
    mocks.limit.mockReturnValue({ success: false });
    expect((await POST(request(body))).status).toBe(429);
    mocks.limit.mockReturnValue({ success: true });
    mocks.query.mockRejectedValue(new Error("database offline"));
    const response = await POST(request(body));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "record_unavailable" });
  });
});
