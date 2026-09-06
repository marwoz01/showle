import { beforeEach, describe, expect, it, vi } from "vitest";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/gemini", () => ({ getOpenRouter: () => ({ chat: { completions: { create } } }) }));
import { interpretRecommendation, RECOMMENDATION_CHAT_MODEL } from "@/lib/recommend-ai";
beforeEach(() => { vi.clearAllMocks(); });
describe("bounded AI interpretation", () => {
  it("skips the provider for pure filters", async () => {
    expect((await interpretRecommendation("")).source).toBe("local");
    expect(create).not.toHaveBeenCalled();
  });
  it("preserves original negation, only sends the description, and caches valid translations", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ queryEnglish: "comedy with horror" }) } }] });
    const text = "komedia bez horroru";
    const result = await interpretRecommendation(text);
    expect(result.excludedGenres).toContain("Horror");
    expect(result.includedGenres).not.toContain("Horror");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: RECOMMENDATION_CHAT_MODEL, max_tokens: 400, response_format: { type: "json_object" },
      messages: [expect.objectContaining({ role: "system" }), { role: "user", content: text }],
    }), { timeout: 6000, maxRetries: 0 });
    await interpretRecommendation(text);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it.each(["invalid JSON", '{"queryEnglish":42}', JSON.stringify({ queryEnglish: "x".repeat(1001) })])("falls back safely on invalid output %#", async (content) => {
    create.mockResolvedValue({ choices: [{ message: { content } }] });
    expect((await interpretRecommendation("bez wojny")).source).toBe("local");
  });
  it("retains local exclusions during a provider outage", async () => {
    create.mockRejectedValue(new Error("unavailable"));
    expect(await interpretRecommendation("bez horrorów")).toMatchObject({ excludedGenres: ["Horror"], source: "local" });
  });
});
