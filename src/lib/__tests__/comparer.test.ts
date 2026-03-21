import { describe, it, expect } from "vitest";
import { compareMedia } from "@/lib/comparer";
import { MediaDetails } from "@/types";
import en from "@/i18n/en";

function makeMovie(overrides: Partial<MediaDetails> = {}): MediaDetails {
  return {
    id: 1,
    title: "Test Movie",
    type: "movie",
    year: 2000,
    genres: ["Action"],
    country: "United States",
    director: "John Doe",
    leadActor: "Actor One",
    runtime: 120,
    budget: 100,
    popularity: 50,
    rating: 7.0,
    posterPath: "",
    overview: "A test movie.",
    ...overrides,
  };
}

describe("compareMedia", () => {
  it("returns exact for identical movies", () => {
    const movie = makeMovie();
    const result = compareMedia(movie, movie, en);

    expect(result).toHaveLength(9);
    result.forEach((field) => {
      expect(field.status).toBe("exact");
    });
  });

  it("returns miss for completely different movies", () => {
    const guess = makeMovie({
      year: 1950,
      genres: ["Horror"],
      country: "France",
      director: "Jane Smith",
      leadActor: "Actor Two",
      runtime: 200,
      budget: 5,
      popularity: 5,
      rating: 2.0,
    });
    const answer = makeMovie();
    const result = compareMedia(guess, answer, en);

    result.forEach((field) => {
      expect(field.status).toBe("miss");
    });
  });
});

describe("year comparison", () => {
  it("exact when same year", () => {
    const result = compareMedia(makeMovie({ year: 2000 }), makeMovie({ year: 2000 }), en);
    expect(result[0].status).toBe("exact");
    expect(result[0].direction).toBeNull();
  });

  it("partial when within 3 years", () => {
    const result = compareMedia(makeMovie({ year: 1998 }), makeMovie({ year: 2000 }), en);
    expect(result[0].status).toBe("partial");
    expect(result[0].direction).toBe("up");
  });

  it("miss when more than 3 years apart", () => {
    const result = compareMedia(makeMovie({ year: 1990 }), makeMovie({ year: 2000 }), en);
    expect(result[0].status).toBe("miss");
    expect(result[0].direction).toBe("up");
  });

  it("direction down when guess is higher", () => {
    const result = compareMedia(makeMovie({ year: 2005 }), makeMovie({ year: 2000 }), en);
    expect(result[0].direction).toBe("down");
  });
});

describe("genres comparison", () => {
  it("exact when identical genres", () => {
    const result = compareMedia(
      makeMovie({ genres: ["Action", "Drama"] }),
      makeMovie({ genres: ["Action", "Drama"] }),
      en
    );
    expect(result[1].status).toBe("exact");
  });

  it("exact is case-insensitive", () => {
    const result = compareMedia(
      makeMovie({ genres: ["action"] }),
      makeMovie({ genres: ["Action"] }),
      en
    );
    expect(result[1].status).toBe("exact");
  });

  it("partial when some genres overlap", () => {
    const result = compareMedia(
      makeMovie({ genres: ["Action", "Comedy"] }),
      makeMovie({ genres: ["Action", "Drama"] }),
      en
    );
    expect(result[1].status).toBe("partial");
  });

  it("miss when no genres overlap", () => {
    const result = compareMedia(
      makeMovie({ genres: ["Horror"] }),
      makeMovie({ genres: ["Comedy"] }),
      en
    );
    expect(result[1].status).toBe("miss");
  });
});

describe("country comparison", () => {
  it("exact when same country", () => {
    const result = compareMedia(
      makeMovie({ country: "France" }),
      makeMovie({ country: "France" }),
      en
    );
    expect(result[2].status).toBe("exact");
  });

  it("case-insensitive", () => {
    const result = compareMedia(
      makeMovie({ country: "france" }),
      makeMovie({ country: "France" }),
      en
    );
    expect(result[2].status).toBe("exact");
  });

  it("miss when different country", () => {
    const result = compareMedia(
      makeMovie({ country: "France" }),
      makeMovie({ country: "Germany" }),
      en
    );
    expect(result[2].status).toBe("miss");
  });
});

describe("director comparison", () => {
  it("exact when same director", () => {
    const result = compareMedia(
      makeMovie({ director: "Christopher Nolan" }),
      makeMovie({ director: "Christopher Nolan" }),
      en
    );
    expect(result[3].status).toBe("exact");
  });

  it("miss when different director", () => {
    const result = compareMedia(
      makeMovie({ director: "Christopher Nolan" }),
      makeMovie({ director: "Steven Spielberg" }),
      en
    );
    expect(result[3].status).toBe("miss");
  });
});

describe("runtime comparison", () => {
  it("exact when same runtime", () => {
    const result = compareMedia(makeMovie({ runtime: 120 }), makeMovie({ runtime: 120 }), en);
    expect(result[5].status).toBe("exact");
  });

  it("partial when within 15 minutes", () => {
    const result = compareMedia(makeMovie({ runtime: 110 }), makeMovie({ runtime: 120 }), en);
    expect(result[5].status).toBe("partial");
    expect(result[5].direction).toBe("up");
  });

  it("miss when more than 15 minutes apart", () => {
    const result = compareMedia(makeMovie({ runtime: 90 }), makeMovie({ runtime: 120 }), en);
    expect(result[5].status).toBe("miss");
  });
});

describe("budget comparison", () => {
  it("exact when same budget", () => {
    const result = compareMedia(makeMovie({ budget: 100 }), makeMovie({ budget: 100 }), en);
    expect(result[6].status).toBe("exact");
  });

  it("partial when within 25% ratio", () => {
    const result = compareMedia(makeMovie({ budget: 80 }), makeMovie({ budget: 100 }), en);
    expect(result[6].status).toBe("partial");
  });

  it("miss when over 25% ratio", () => {
    const result = compareMedia(makeMovie({ budget: 10 }), makeMovie({ budget: 100 }), en);
    expect(result[6].status).toBe("miss");
  });

  it("exact when both budgets unknown (0)", () => {
    const result = compareMedia(makeMovie({ budget: 0 }), makeMovie({ budget: 0 }), en);
    expect(result[6].status).toBe("exact");
    expect(result[6].guessValue).toBe("?");
  });

  it("miss when one budget unknown", () => {
    const result = compareMedia(makeMovie({ budget: 0 }), makeMovie({ budget: 100 }), en);
    expect(result[6].status).toBe("miss");
  });
});

describe("popularity comparison", () => {
  it("exact when same bucket", () => {
    const result = compareMedia(makeMovie({ popularity: 25 }), makeMovie({ popularity: 40 }), en);
    expect(result[7].status).toBe("exact");
  });

  it("partial when adjacent buckets", () => {
    const result = compareMedia(makeMovie({ popularity: 10 }), makeMovie({ popularity: 30 }), en);
    expect(result[7].status).toBe("partial");
  });

  it("miss when distant buckets", () => {
    const result = compareMedia(makeMovie({ popularity: 5 }), makeMovie({ popularity: 150 }), en);
    expect(result[7].status).toBe("miss");
  });
});

describe("rating comparison", () => {
  it("exact when within 0.3", () => {
    const result = compareMedia(makeMovie({ rating: 7.0 }), makeMovie({ rating: 7.2 }), en);
    expect(result[8].status).toBe("exact");
  });

  it("partial when within 1.0", () => {
    const result = compareMedia(makeMovie({ rating: 6.5 }), makeMovie({ rating: 7.0 }), en);
    expect(result[8].status).toBe("partial");
  });

  it("miss when over 1.0 apart", () => {
    const result = compareMedia(makeMovie({ rating: 4.0 }), makeMovie({ rating: 7.0 }), en);
    expect(result[8].status).toBe("miss");
  });
});
