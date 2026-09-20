import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), execute: vi.fn(), query: vi.fn(), report: vi.fn(), deletions: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/server-error", () => ({ reportServerError: mocks.report }));
vi.mock("@/lib/account-data", () => ({ processAccountDeletionTasks: mocks.deletions }));
import { GET } from "@/app/api/health/route";
import { POST } from "@/app/api/maintenance/route";
const secret = "test-only-ops-token-at-least-thirty-two-characters";
const request = (token = secret) => new Request("https://showle.test/api/health", { headers: { authorization: `Bearer ${token}` } });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("OPS_SECRET", secret);
  for (const key of ["DATABASE_URL", "TMDB_API_KEY", "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]) vi.stubEnv(key, "configured-test-value");
  vi.stubEnv("TRUSTED_PROXY", "forwarded");
  mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({ $executeRaw: mocks.execute, $queryRaw: mocks.query }));
  mocks.query.mockResolvedValue([{ limiter: true, games: true, recommendations: true, preferences: true, deletionQueue: true, vector: true }]);
  mocks.execute.mockResolvedValue(0); mocks.report.mockReturnValue("sanitized-error-id");
  mocks.deletions.mockResolvedValue(0);
});
afterEach(() => vi.unstubAllEnvs());

describe("protected operational routes", () => {
  it("never reads or changes storage without the complete configured bearer token", async () => {
    for (const call of [GET, POST]) {
      expect((await call(request("wrong"))).status).toBe(401);
      vi.stubEnv("OPS_SECRET", "");
      expect((await call(request())).status).toBe(401);
      vi.stubEnv("OPS_SECRET", "too-short");
      expect((await call(request("too-short"))).status).toBe(401);
      vi.stubEnv("OPS_SECRET", secret);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("distinguishes connectivity from missing required schema", async () => {
    expect((await GET(request())).status).toBe(200);
    mocks.query.mockResolvedValue([{ limiter: false, games: true, recommendations: true, preferences: true, deletionQueue: true, vector: true }]);
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ status: "degraded", database: "reachable", schema: { limiter: false } });
  });
  it("bounds maintenance and reports another batch without deleting account history", async () => {
    mocks.execute.mockResolvedValueOnce(0).mockResolvedValueOnce(1000).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    const response = await POST(request());
    expect(await response.json()).toEqual({ deleted: { rooms: 1000, usage: 2, limits: 3 }, accountDeletions: 0, moreMayRemain: true });
    const sql = mocks.execute.mock.calls.slice(1).map(([parts]) => parts.join(" "));
    expect(sql.every((statement) => statement.includes("LIMIT 1000 FOR UPDATE SKIP LOCKED"))).toBe(true);
    expect(sql.join(" ")).not.toMatch(/GameResult|SavedMovie|UserWallet/);
  });
  it("does not expose connection strings when a dependency fails", async () => {
    mocks.transaction.mockRejectedValue(new Error("postgresql://user:secret@host"));
    for (const call of [GET, POST]) {
      const response = await call(request());
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("secret@host");
    }
  });
});
