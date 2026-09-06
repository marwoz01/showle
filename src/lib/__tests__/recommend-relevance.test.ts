import { beforeEach, describe, expect, it, vi } from "vitest";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/gemini", () => ({ getOpenRouter: () => ({ chat: { completions: { create } } }) }));
import { reviewRecommendationRelevance } from "@/lib/recommend-relevance";
import { rankRecommendations } from "@/lib/recommend-ranking";
import { candidate, filters } from "@/lib/__tests__/fixtures/recommendations";
beforeEach(() => { vi.clearAllMocks(); });
const respond = (scores: unknown) => create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ scores }) } }] });
describe("grounded relevance review", () => {
  it("removes topic/tone mismatches even when their genre matches", async () => {
    const movies = [candidate(1, { genres: ["Comedy"], overview: "A tragic wartime story" }), candidate(2, { genres: ["Comedy"], overview: "A lighthearted reunion" })];
    respond([{ id: 1, score: 0 }, { id: 2, score: 3 }]);
    const result = await reviewRecommendationRelevance(movies, "warm comedy without war", null);
    expect(rankRecommendations(movies, filters, [], null, { relevance: result.scores }).map((movie) => movie.tmdbId)).toEqual([2]);
    expect(result.source).toBe("ai");
  });
  it.each([
    [{ id: 999, score: 3 }], [{ id: 1, score: 8 }], [{ id: 1, score: "3" }],
    [{ id: 1, score: 1.5 }], [], [{ id: 1, score: 2 }, { id: 1, score: 3 }],
  ])("rejects invented IDs, invalid scores or incomplete coverage %#", async (...items) => {
    respond(items);
    expect((await reviewRecommendationRelevance([candidate()], "a drama", null)).scores).toBeNull();
  });
  it("uses bounded public facts only, without ratings/history or unbounded text", async () => {
    respond(Array.from({ length: 24 }, (_, i) => ({ id: i + 1, score: 2 })));
    await reviewRecommendationRelevance(Array.from({ length: 60 }, (_, i) => candidate(i + 1, { overview: "x".repeat(5000) })), "y".repeat(1000), null);
    const [request, options] = create.mock.calls[0];
    const input = JSON.parse(request.messages[1].content);
    expect(input.movies).toHaveLength(24);
    expect(input.movies[0].overview).toHaveLength(700);
    expect(input.description).toHaveLength(400);
    expect(input.movies[0]).not.toHaveProperty("rating");
    expect(input).not.toHaveProperty("userId");
    expect(options).toEqual({ timeout: 6000, maxRetries: 0 });
  });
  it("falls back without relaxing filters when unavailable", async () => {
    create.mockRejectedValue(new Error("unavailable"));
    const result = await reviewRecommendationRelevance([candidate()], "a drama", null);
    expect(result).toEqual({ scores: null, source: "local" });
    expect(rankRecommendations([candidate()], { ...filters, genres: ["Comedy"] }, [], null, { relevance: result.scores })).toEqual([]);
  });
  it("does not call AI for pure filters or an empty pool", async () => {
    await reviewRecommendationRelevance([candidate()], "", null);
    await reviewRecommendationRelevance([], "a drama", null);
    expect(create).not.toHaveBeenCalled();
  });
});
