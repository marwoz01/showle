import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("@/lib/server-error", () => ({ reportServerError: mocks.report }));
import { getMovieDetails, getPopularMovies } from "@/lib/tmdb";

const fetchMock = vi.fn();
const popular = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, vote_count: 500, release_date: "2020-01-01", poster_path: "/poster.jpg" }));
const movie = (id: number) => ({ id, title: `Movie ${id}`, release_date: "2020-01-01", genres: [], production_countries: [],
  vote_count: 500, vote_average: 7, credits: { cast: [], crew: [] }, overview: "Plot" });
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("bounded TMDB runtime calls", () => {
  it("loads a popular page with at most four concurrent details calls and bundled credits", async () => {
    let active = 0, maximum = 0;
    fetchMock.mockImplementation(async (input: string, options: RequestInit) => {
      const url = new URL(input);
      expect(options.signal).toBeInstanceOf(AbortSignal);
      if (url.pathname.endsWith("/popular")) return Response.json({ results: popular, total_pages: 50 });
      expect(url.searchParams.get("append_to_response")).toBe("credits");
      active++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return Response.json(movie(Number(url.pathname.split("/").at(-1))));
    });
    const result = await getPopularMovies(1);
    expect(result.results).toHaveLength(20);
    expect(result.totalPages).toBe(20);
    expect(maximum).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(21);
  });
  it("aborts a hung request and reports a safe operational error", async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    fetchMock.mockImplementation((_input: string, { signal }: RequestInit) => new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
    const pending = getMovieDetails(1);
    timeout.abort(new DOMException("timed out", "TimeoutError"));
    expect(await pending).toBeNull();
    expect(mocks.report).toHaveBeenCalledWith("tmdb.request", expect.any(DOMException));
  });
  it("stops launching queued details after the page deadline", async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => ms === 10000 ? deadline.signal : new AbortController().signal);
    fetchMock.mockImplementation((input: string, { signal }: RequestInit) => {
      if (input.includes("/popular?")) return Promise.resolve(Response.json({ results: popular, total_pages: 1 }));
      return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(signal.reason), { once: true }));
    });
    const pending = getPopularMovies(1);
    const result = expect(pending).rejects.toThrow("TMDB details unavailable");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    deadline.abort();
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
