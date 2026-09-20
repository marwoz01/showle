import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const database = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  database.load();
  throw new Error("Database unavailable: the standalone game must not connect");
});
vi.mock("@/lib/higher-lower-catalog", () => ({
  getHigherLowerCatalog: () => ({
    version: "production-regression-catalog",
    movies: [
      { id: 1, titles: { pl: "Pierwszy film", en: "First movie" }, year: 1980, backdropPath: "/first.jpg", voteCount: 4000 },
      { id: 2, titles: { pl: "Drugi film", en: "Second movie" }, year: 2000, backdropPath: "/second.jpg", voteCount: 4000 },
      { id: 3, titles: { pl: "Trzeci film", en: "Third movie" }, year: 2020, backdropPath: "/third.jpg", voteCount: 4000 },
    ],
  }),
}));

const request = (body: unknown) => new Request("https://showle.example/api/higher-lower", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.42" },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("HIGHER_LOWER_SECRET", "production-regression-test-only-secret");
  vi.stubEnv("CLERK_SECRET_KEY", "");
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("higher/lower production without database storage", () => {
  it.each(["", "postgresql://test:test@127.0.0.1:1/unavailable"])(
    "starts and resumes with a missing or unreachable DATABASE_URL (%s)",
    async (databaseUrl) => {
      vi.stubEnv("DATABASE_URL", databaseUrl);
      const { POST } = await import("@/app/api/higher-lower/route");
      const started = await POST(request({ action: "start", locale: "pl" }));

      expect(started.status).toBe(200);
      const body = await started.json();
      expect(body.token).toEqual(expect.any(String));
      expect(body.game).toMatchObject({ score: 0, status: "guessing", right: { year: null } });
      expect([1980, 2000, 2020]).toContain(body.game.left.year);

      const resumed = await POST(request({ action: "resume", locale: "pl", token: body.token }));
      expect(resumed.status).toBe(200);
      expect((await resumed.json()).game).toEqual(body.game);
      expect(database.load).not.toHaveBeenCalled();
    },
  );

  it("still rejects an exhausted per-IP budget without loading the database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { rateLimit } = await import("@/lib/rate-limit");
    const { POST } = await import("@/app/api/higher-lower/route");
    rateLimit("higher-lower:ip:203.0.113.42", { limit: 180, windowMs: 60_000, cost: 180 });

    const response = await POST(request({ action: "start", locale: "pl" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limit" });
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(database.load).not.toHaveBeenCalled();
  });
});
