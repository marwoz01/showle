import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { movieChoiceNow as now } from "./movie-choice-fixtures";

const rooms = vi.hoisted(() => ({ create: vi.fn(), get: vi.fn(), mutate: vi.fn() }));
vi.mock("@/lib/movie-choice-room", () => ({ createMovieChoiceRoom: rooms.create, getMovieChoiceRoom: rooms.get, mutateMovieChoiceRoom: rooms.mutate }));
const token = "a".repeat(43);
const host = { action: "create", name: "Host", locale: "pl" };

function post(body: unknown = host, options: { origin?: string | null; cookie?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-forwarded-for": options.ip ?? "203.0.113.1" };
  if (options.origin !== null) headers.origin = options.origin ?? "http://localhost";
  if (options.cookie) headers.cookie = `showle_movie_choice=${options.cookie}`;
  return new NextRequest("http://localhost/api/recommend/together", { method: "POST", headers, body: JSON.stringify(body) });
}
function get(code?: string, cookie?: string) {
  return new NextRequest(`http://localhost/api/recommend/together${code === undefined ? "" : `?code=${code}`}`, {
    headers: cookie ? { cookie: `showle_movie_choice=${cookie}` } : {},
  });
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  rooms.create.mockResolvedValue({ code: "ABCDEF", status: "waiting", you: "host" });
  rooms.get.mockResolvedValue({ code: "ABCDEF", status: "waiting", you: "host" });
  rooms.mutate.mockResolvedValue({ code: "ABCDEF", status: "preferences", you: "guest" });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("shared choice request identity and boundaries", () => {
  it("bootstraps an HttpOnly identity without exposing it or accessing the database", async () => {
    const { GET } = await import("@/app/api/recommend/together/route");
    const response = await GET(get());
    expect(await response.json()).toEqual({ ready: true });
    const cookie = response.cookies.get("showle_movie_choice");
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/api/recommend/together" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(rooms.create).not.toHaveBeenCalled();
    expect(rooms.get).not.toHaveBeenCalled();
  });

  it("keeps the bootstrapped identity stable across refreshes and room creation", async () => {
    const { GET, POST } = await import("@/app/api/recommend/together/route");
    const { movieChoiceIdentity } = await import("@/lib/movie-choice-session");
    expect((await GET(get(undefined, token))).headers.get("set-cookie")).toBeNull();
    const response = await POST(post(host, { cookie: token }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(rooms.create).toHaveBeenCalledWith(movieChoiceIdentity(token), "Host", "pl");
    expect(JSON.stringify(await response.json())).not.toContain(token);
    expect(movieChoiceIdentity(token)).not.toBe(token);
  });

  it("makes an invite join retry use the same server-side member identity", async () => {
    const { POST } = await import("@/app/api/recommend/together/route");
    const { movieChoiceIdentity } = await import("@/lib/movie-choice-session");
    const join = { action: "join", code: "ABCDEF", name: "Guest" };
    await POST(post(join, { cookie: token }));
    await POST(post(join, { cookie: token }));
    expect(rooms.mutate).toHaveBeenNthCalledWith(1, join, movieChoiceIdentity(token));
    expect(rooms.mutate).toHaveBeenNthCalledWith(2, join, movieChoiceIdentity(token));
  });

  it.each([undefined, "short", "bad!".repeat(11)])("does not read room state with a missing/invalid session %#", async (cookie) => {
    const { GET } = await import("@/app/api/recommend/together/route");
    const response = await GET(get("ABCDEF", cookie));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "room_not_found" });
    expect(rooms.get).not.toHaveBeenCalled();
  });

  it("uses only the cookie identity to read a private room and disables caching", async () => {
    const { GET } = await import("@/app/api/recommend/together/route");
    const { movieChoiceIdentity } = await import("@/lib/movie-choice-session");
    const response = await GET(get("abcdef", token));
    expect(response.status).toBe(200);
    expect(rooms.get).toHaveBeenCalledWith("ABCDEF", movieChoiceIdentity(token));
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });

  it.each([null, "https://attacker.example", "http://localhost.evil.test"])("rejects absent or foreign mutation origin %s", async (origin) => {
    const { POST } = await import("@/app/api/recommend/together/route");
    const response = await POST(post(host, { origin }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_origin" });
    expect(rooms.create).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied identity and oversized input before database work", async () => {
    const { POST } = await import("@/app/api/recommend/together/route");
    expect((await POST(post({ ...host, playerId: "victim-id" }, { cookie: token }))).status).toBe(400);
    expect((await POST(post({ ...host, padding: "x".repeat(5000) }))).status).toBe(413);
    expect(rooms.create).not.toHaveBeenCalled();
  });

  it("requires an established session for votes and preferences", async () => {
    const { POST } = await import("@/app/api/recommend/together/route");
    expect((await POST(post({ action: "vote", code: "ABCDEF", batch: 1, movieId: 1, liked: true }))).status).toBe(404);
    expect(rooms.mutate).not.toHaveBeenCalled();
  });

  it("bounds room creation despite rotating session tokens", async () => {
    const { POST } = await import("@/app/api/recommend/together/route");
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(post(host, { cookie: String(i).repeat(43) }))).status).toBe(200);
    }
    const response = await POST(post(host, { cookie: "z".repeat(43) }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited" });
    expect(rooms.create).toHaveBeenCalledTimes(10);
  });

  it("returns recoverable candidate errors without exposing diagnostics", async () => {
    const { POST } = await import("@/app/api/recommend/together/route");
    const { MovieChoiceError } = await import("@/lib/movie-choice-input");
    rooms.mutate.mockRejectedValueOnce(new MovieChoiceError("no_results", 422));
    const response = await POST(post({ action: "preferences", code: "ABCDEF", batch: 1, preferences: { genres: [], excludedGenres: [], maxRuntime: null, providerIds: [] } }, { cookie: token }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "no_results" });
  });
});
