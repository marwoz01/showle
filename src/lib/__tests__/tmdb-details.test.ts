import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const details = (title = "Donnie Darko") => ({
  id: 141,
  title,
  release_date: "2001-10-26",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  overview: "A strange visitor.",
  tagline: "Time is running out.",
  popularity: 2,
  vote_average: 7.78,
  vote_count: 12400,
  runtime: 114,
  budget: 4500000,
  genres: [{ id: 18, name: "Drama" }],
  production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
  credits: {
    cast: [
      { name: "Supporting Actor", order: 1, character: "Friend", profile_path: null },
      { name: "Jake Gyllenhaal", order: 0, character: "Donnie", profile_path: "/jake.jpg" },
    ],
    crew: [{ name: "Richard Kelly", job: "Director", profile_path: "/richard.jpg" }],
  },
});

const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset().mockImplementation(async () => Response.json(details()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("movie details requests", () => {
  it("fetches details and credits together while preserving mapped game parameters", async () => {
    const { getMovieDetails } = await import("@/lib/tmdb");
    expect(await getMovieDetails(141)).toEqual({
      id: 141,
      title: "Donnie Darko",
      type: "movie",
      year: 2001,
      genres: ["Drama"],
      country: "United States of America",
      countryCode: "US",
      director: "Richard Kelly",
      directorProfilePath: "/richard.jpg",
      leadActor: "Jake Gyllenhaal",
      castNames: ["Jake Gyllenhaal", "Supporting Actor"],
      runtime: 114,
      budget: 5,
      popularity: 12400,
      rating: 7.8,
      posterPath: "/poster.jpg",
      backdropPath: "/backdrop.jpg",
      overview: "A strange visitor.",
      tagline: "Time is running out.",
      cast: [
        { name: "Jake Gyllenhaal", character: "Donnie", profilePath: "/jake.jpg" },
        { name: "Supporting Actor", character: "Friend", profilePath: "" },
      ],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/3/movie/141");
    expect(url.searchParams.get("append_to_response")).toBe("credits");
    expect(url.searchParams.get("language")).toBe("en-US");
  });

  it("shares concurrent requests and isolates returned metadata from mutation", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const { getMovieDetails } = await import("@/lib/tmdb");
    const first = getMovieDetails(141);
    const second = getMovieDetails(141);
    expect(fetchMock).toHaveBeenCalledOnce();
    finish(Response.json(details()));
    const [one, two] = await Promise.all([first, second]);
    one!.genres.push("Changed");
    one!.cast![0].name = "Changed";
    expect(two!.genres).toEqual(["Drama"]);
    expect(two!.cast![0].name).toBe("Jake Gyllenhaal");
    expect(await getMovieDetails(141)).toEqual(two);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps full cast names for matching while limiting displayed cast to eight", async () => {
    const source = details();
    source.credits.cast = Array.from({ length: 14 }, (_, order) => ({ name: `Actor ${order}`, order, character: `Character ${order}`, profile_path: null }));
    fetchMock.mockResolvedValueOnce(Response.json(source));
    const { getMovieDetails } = await import("@/lib/tmdb");
    const movie = await getMovieDetails(141);
    expect(movie?.cast).toHaveLength(8);
    expect(movie?.castNames).toHaveLength(14);
    expect(movie?.castNames?.[13]).toBe("Actor 13");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps languages separate and expires warm entries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T10:00:00Z"));
    fetchMock.mockImplementation(async (input: string) => Response.json(details(
      new URL(input).searchParams.get("language") === "pl-PL" ? "Polski tytuł" : "Donnie Darko",
    )));
    const { getMovieDetails } = await import("@/lib/tmdb");
    expect((await getMovieDetails(141, "pl-PL"))?.title).toBe("Polski tytuł");
    expect((await getMovieDetails(141))?.title).toBe("Donnie Darko");
    await getMovieDetails(141, "pl-PL");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(10 * 60_000 + 1);
    await getMovieDetails(141, "pl-PL");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not cache upstream errors or missing credits", async () => {
    const { getMovieDetails } = await import("@/lib/tmdb");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(await getMovieDetails(141)).toBeNull();
    fetchMock.mockResolvedValueOnce(Response.json({ ...details(), credits: undefined }));
    expect(await getMovieDetails(141)).toBeNull();
    expect((await getMovieDetails(141))?.id).toBe(141);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("evicts the least recently used details after reaching the bounded capacity", async () => {
    const { getMovieDetails } = await import("@/lib/tmdb");
    for (let id = 1; id <= 256; id++) await getMovieDetails(id);
    await getMovieDetails(1);
    await getMovieDetails(257);
    await getMovieDetails(1);
    expect(fetchMock).toHaveBeenCalledTimes(257);
    await getMovieDetails(2);
    expect(fetchMock).toHaveBeenCalledTimes(258);
  });
});
