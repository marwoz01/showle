import { describe, it, expect } from "vitest";
import { generateHints, getRevealedHints } from "@/lib/hints";
import { MediaDetails } from "@/types";
import en from "@/i18n/en";

function makeMovie(overrides: Partial<MediaDetails> = {}): MediaDetails {
  return {
    id: 1,
    title: "Inception",
    type: "movie",
    year: 2010,
    genres: ["Action", "Sci-Fi"],
    country: "United States",
    director: "Christopher Nolan",
    leadActor: "Leonardo DiCaprio",
    runtime: 148,
    budget: 160,
    popularity: 100,
    rating: 8.8,
    posterPath: "",
    overview: "A thief who steals corporate secrets through dream-sharing technology.",
    tagline: "Your mind is the scene of the crime.",
    ...overrides,
  };
}

describe("generateHints", () => {
  it("returns exactly 3 hints", () => {
    const hints = generateHints(makeMovie(), en);
    expect(hints).toHaveLength(3);
  });

  it("first hint is genres, revealed at attempt 2", () => {
    const hints = generateHints(makeMovie(), en);
    expect(hints[0].type).toBe("genre");
    expect(hints[0].revealedAt).toBe(2);
    expect(hints[0].content).toContain("Action");
    expect(hints[0].content).toContain("Sci-Fi");
  });

  it("second hint is director, revealed at attempt 4", () => {
    const hints = generateHints(makeMovie(), en);
    expect(hints[1].type).toBe("director");
    expect(hints[1].revealedAt).toBe(4);
    expect(hints[1].content).toContain("Christopher Nolan");
  });

  it("third hint uses tagline when available, revealed at attempt 6", () => {
    const hints = generateHints(makeMovie(), en);
    expect(hints[2].type).toBe("trivia");
    expect(hints[2].revealedAt).toBe(6);
    expect(hints[2].content).toContain("scene of the crime");
  });

  it("third hint falls back to overview when no tagline", () => {
    const hints = generateHints(makeMovie({ tagline: undefined }), en);
    expect(hints[2].content).toContain("thief who steals");
  });

  it("overview hint is truncated to 120 characters", () => {
    const longOverview = "A".repeat(200);
    const hints = generateHints(makeMovie({ tagline: undefined, overview: longOverview }), en);
    // The overview slice is 120 chars, plus the "Synopsis: " prefix and "..." suffix
    const overviewPart = hints[2].content.replace("Synopsis: ", "").replace("...", "");
    expect(overviewPart.length).toBeLessThanOrEqual(120);
  });
});

describe("getRevealedHints", () => {
  const hints = generateHints(makeMovie(), en);

  it("reveals nothing at attempt 0", () => {
    expect(getRevealedHints(hints, 0)).toHaveLength(0);
  });

  it("reveals nothing at attempt 1", () => {
    expect(getRevealedHints(hints, 1)).toHaveLength(0);
  });

  it("reveals 1 hint at attempt 2", () => {
    const revealed = getRevealedHints(hints, 2);
    expect(revealed).toHaveLength(1);
    expect(revealed[0].type).toBe("genre");
  });

  it("reveals 1 hint at attempt 3", () => {
    expect(getRevealedHints(hints, 3)).toHaveLength(1);
  });

  it("reveals 2 hints at attempt 4", () => {
    const revealed = getRevealedHints(hints, 4);
    expect(revealed).toHaveLength(2);
    expect(revealed[1].type).toBe("director");
  });

  it("reveals all 3 hints at attempt 6", () => {
    const revealed = getRevealedHints(hints, 6);
    expect(revealed).toHaveLength(3);
  });

  it("reveals all 3 hints at attempt 7 (max)", () => {
    expect(getRevealedHints(hints, 7)).toHaveLength(3);
  });
});
