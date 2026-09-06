import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MediaDetails } from "@/types";

vi.mock("@/i18n", async () => {
  const { default: pl } = await import("@/i18n/pl");
  return { useTranslation: () => ({ t: pl, locale: "pl" }) };
});
vi.mock("@/components/collection/SaveMovieButton", () => ({ default: () => null }));
vi.mock("@/components/movie/MovieDetailsModal", () => ({ default: () => null }));
vi.mock("@/components/ui/icons", () => ({ Star: () => null, Zap: () => null, ArrowUp: () => null }));
import RecommendationCard from "@/components/recommend/RecommendationCard";
import ComparisonCell from "@/components/game/ComparisonCell";

describe("punctuation in rendered data-driven cards", () => {
  it.each(["top", "regular"] as const)("normalizes movie and AI copy in the %s card without mutating input", (variant) => {
    const movie: MediaDetails = {
      id: 1, title: "Film\u2014część II", type: "movie", year: 2020, genres: [], country: "PL",
      director: "Director", leadActor: "Actor", runtime: 100, budget: 1, popularity: 100,
      rating: 8, posterPath: "", overview: "Fabuła\u2013ciąg dalszy",
    };
    const before = structuredClone(movie);
    const html = renderToStaticMarkup(createElement(RecommendationCard, {
      movie, justification: "AI\u2014trafny wybór", index: 0, variant,
    }));
    expect(html).toContain("Film-część II");
    expect(html).toContain("AI-trafny wybór");
    expect(html).not.toMatch(/[\u2010-\u2015\u2212]/);
    expect(movie).toEqual(before);
  });
  it("normalizes both the visible comparison and its tooltip", () => {
    const html = renderToStaticMarkup(createElement(ComparisonCell, {
      label: "REŻYSER", value: "Anna\u2013Maria", status: "exact", revealIndex: 0,
    }));
    expect(html).toContain('title="Anna-Maria"');
    expect(html).toContain("Anna-Maria</span>");
    expect(html).not.toContain("Anna\u2013Maria");
  });
});
