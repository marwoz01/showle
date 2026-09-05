import { describe, expect, it } from "vitest";
import {
  selectBestTrailer,
  type TrailerCandidate,
} from "@/lib/trailers";

function makeTrailer(
  overrides: Partial<TrailerCandidate> = {},
): TrailerCandidate {
  return {
    key: "abcdefghijk",
    name: "Official trailer",
    site: "YouTube",
    type: "Trailer",
    official: true,
    iso_639_1: "en",
    published_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("selectBestTrailer", () => {
  it("prefers a trailer over a teaser", () => {
    const result = selectBestTrailer(
      [
        makeTrailer({ key: "teaser12345", type: "Teaser" }),
        makeTrailer({ key: "trailer1234", type: "Trailer", official: false }),
      ],
      "en-US",
    );

    expect(result?.key).toBe("trailer1234");
  });

  it("prefers the selected language when candidates are otherwise equal", () => {
    const result = selectBestTrailer(
      [
        makeTrailer({ key: "english12345", iso_639_1: "en" }),
        makeTrailer({ key: "polish123456", iso_639_1: "pl" }),
      ],
      "pl-PL",
    );

    expect(result?.key).toBe("polish123456");
  });

  it("prefers an official video in the same language and type", () => {
    const result = selectBestTrailer(
      [
        makeTrailer({ key: "fanmade12345", official: false }),
        makeTrailer({ key: "official1234", official: true }),
      ],
      "en-US",
    );

    expect(result?.key).toBe("official1234");
  });

  it("ignores non-YouTube videos and invalid keys", () => {
    const result = selectBestTrailer(
      [
        makeTrailer({ key: "vimeo123456", site: "Vimeo" }),
        makeTrailer({ key: "bad key" }),
      ],
      "en-US",
    );

    expect(result).toBeNull();
  });
});
