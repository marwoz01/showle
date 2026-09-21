import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ movie: vi.fn(), rateLimit: vi.fn() }));
vi.mock("@/lib/tmdb", () => ({ getMovieDetails: mocks.movie }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
import { GET } from "@/app/api/movies/details/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockReturnValue({ success: true });
  mocks.movie.mockResolvedValue({ id: 141, title: "Donnie Darko" });
});

describe("public movie details cache", () => {
  it("allows successful localized metadata to be reused by prefetches", async () => {
    const response = await GET(new NextRequest("http://localhost/api/movies/details?id=141&lang=pl"));
    expect(response.status).toBe(200);
    expect(mocks.movie).toHaveBeenCalledWith(141, "pl-PL");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=3600");
    expect(await response.json()).toEqual({ id: 141, title: "Donnie Darko" });
  });

  it("never caches unavailable metadata", async () => {
    mocks.movie.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/api/movies/details?id=141"));
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps malformed requests and rate limits out of caches", async () => {
    const invalid = await GET(new NextRequest("http://localhost/api/movies/details?id=invalid"));
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("Cache-Control")).toBe("no-store");
    mocks.rateLimit.mockReturnValue({ success: false });
    const limited = await GET(new NextRequest("http://localhost/api/movies/details?id=141"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Cache-Control")).toBe("no-store");
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(mocks.movie).not.toHaveBeenCalled();
  });
});
