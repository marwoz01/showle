import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.limit }));
vi.mock("@/lib/higher-lower-catalog", () => ({
  getHigherLowerCatalog: () => ({
    version: "test-catalog",
    movies: [
      { id: 1, titles: { pl: "Film pierwszy", en: "First movie" }, year: 2002, runtime: 100, backdropPath: "/first.jpg", voteCount: 4000 },
      { id: 2, titles: { pl: "Film drugi", en: "Second movie" }, year: 2001, runtime: 150, backdropPath: "/second.jpg", voteCount: 4000 },
      { id: 3, titles: { pl: "Film trzeci", en: "Third movie" }, year: 2000, runtime: 200, backdropPath: "/third.jpg", voteCount: 4000 },
    ],
  }),
}));
import { POST } from "@/app/api/higher-lower/route";
import { HIGHER_LOWER_SESSION_MS } from "@/lib/higher-lower";
import type { HigherLowerResponse } from "@/types/higher-lower";

const now = Date.parse("2026-09-07T12:00:00Z");
const request = (body: unknown) => new Request("http://localhost/api/higher-lower", {
  method: "POST", headers: { "x-forwarded-for": "203.0.113.1" }, body: JSON.stringify(body),
});
const start = async () => (await POST(request({ action: "start", locale: "pl" }))).json() as Promise<HigherLowerResponse>;
const yearFor = (id: number) => 2003 - id;
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("HIGHER_LOWER_SECRET", "test-only-api-secret");
  mocks.limit.mockReturnValue({ success: true });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("higher/lower public API", () => {
  it("plays, resumes in another locale, reveals and advances without sending hidden release years", async () => {
    const started = await start();
    expect(started.game.right.year).toBeNull();
    expect(started.game.right).not.toHaveProperty("runtime");
    expect(started.game.left.year).toBe(yearFor(started.game.left.id));
    const resumed = await POST(request({ action: "resume", locale: "en", token: started.token }));
    const resumedBody: HigherLowerResponse = await resumed.json();
    expect(resumedBody.game.right).toMatchObject({ id: started.game.right.id, year: null });
    expect(resumedBody.game.left.title).toContain("movie");
    const choice = yearFor(started.game.right.id) > started.game.left.year ? "higher" : "lower";
    const answered = await POST(request({ action: "answer", locale: "pl", token: started.token, choice }));
    const revealed: HigherLowerResponse = await answered.json();
    expect(answered.status).toBe(200);
    expect(answered.headers.get("Cache-Control")).toContain("no-store");
    expect(revealed.game).toMatchObject({ score: 1, status: "revealed", right: { year: yearFor(started.game.right.id) } });
    const duplicate = await POST(request({ action: "answer", locale: "pl", token: revealed.token, choice }));
    expect(duplicate.status).toBe(409);
    const next: HigherLowerResponse = await (await POST(request({ action: "next", locale: "pl", token: revealed.token }))).json();
    expect(next.game).toMatchObject({ round: 2, score: 1, left: { id: started.game.right.id }, right: { year: null } });
  });

  it("does not inflate score when an old guessing token is replayed", async () => {
    const started = await start();
    const choice = yearFor(started.game.right.id) > started.game.left.year ? "higher" : "lower";
    const body = { action: "answer", locale: "pl", token: started.token, choice };
    const first: HigherLowerResponse = await (await POST(request(body))).json();
    const replay: HigherLowerResponse = await (await POST(request(body))).json();
    expect(first.game.score).toBe(1);
    expect(replay.game.score).toBe(1);
  });

  it("returns restartable invalid_session for malformed, expired and out-of-order tokens", async () => {
    const started = await start();
    for (const body of [
      { action: "resume", locale: "pl", token: "invalid-token" },
      { action: "next", locale: "pl", token: started.token },
    ]) {
      const response = await POST(request(body));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "invalid_session" });
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    }
    vi.setSystemTime(now + HIGHER_LOWER_SESSION_MS);
    expect((await POST(request({ action: "resume", locale: "pl", token: started.token }))).status).toBe(409);
  });

  it("bounds actual body bytes and rejects score injection and malformed JSON", async () => {
    for (const req of [
      request({ action: "start", locale: "pl", score: 1000 }),
      new Request("http://localhost/api/higher-lower", { method: "POST", body: "{" }),
      new Request("http://localhost/api/higher-lower", { method: "POST", headers: { "Content-Length": "1" }, body: "x".repeat(34001) }),
    ]) {
      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_request" });
    }
  });

  it("applies global and per-IP budgets before parsing and returns a retry hint", async () => {
    mocks.limit.mockReturnValueOnce({ success: true }).mockReturnValueOnce({ success: false });
    const response = await POST(request({ action: "start", locale: "pl" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limit" });
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.limit.mock.calls.map(([key]) => key)).toEqual(["higher-lower:global", "higher-lower:ip:203.0.113.1"]);
    mocks.limit.mockReturnValue({ success: false });
    expect((await POST(new Request("http://localhost/api/higher-lower", { method: "POST", body: "{" }))).status).toBe(429);
  });

  it("returns game_unavailable without a production encryption secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HIGHER_LOWER_SECRET", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request({ action: "start", locale: "pl" }));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "game_unavailable" });
    } finally { log.mockRestore(); }
  });
});
