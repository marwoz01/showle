import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("recommendation fallback diagnostics", () => {
  it("reports the provider stage and failure category without raw data and throttles repeats", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportRecommendationFallback } = await import("@/lib/recommend-diagnostics");
    const error = Object.assign(new Error("secret-key private description https://provider.invalid"), { status: 429 });
    reportRecommendationFallback("embedding", error);
    reportRecommendationFallback("embedding", error);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({ event: "recommendation_fallback", stage: "embedding", reason: "rate_limited", status: 429 });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret-key|private description|provider.invalid/);
  });
  it.each([
    [402, "credits_exhausted"], [401, "authentication"], [403, "authentication"], [503, "unavailable"],
  ])("identifies HTTP %s without logging provider response bodies", async (status, reason) => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportRecommendationFallback } = await import("@/lib/recommend-diagnostics");
    reportRecommendationFallback("relevance", { status, body: "sensitive" });
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ stage: "relevance", reason, status });
  });
  it("separates invalid model output from missing configuration", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportRecommendationFallback } = await import("@/lib/recommend-diagnostics");
    reportRecommendationFallback("interpretation", new SyntaxError("private response"));
    vi.stubEnv("OPENROUTER_API_KEY", "");
    reportRecommendationFallback("interpretation", new Error("missing secret"));
    expect(JSON.parse(log.mock.calls[0][0]).reason).toBe("invalid_response");
    expect(JSON.parse(log.mock.calls[1][0]).reason).toBe("missing_configuration");
  });
});
