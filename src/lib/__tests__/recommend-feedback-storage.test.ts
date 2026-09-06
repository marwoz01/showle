import { describe, expect, it } from "vitest";
import { readFeedback, updateFeedback, type FeedbackEntry } from "@/lib/recommend-feedback-storage";
describe("bounded feedback storage", () => {
  it("migrates legacy records and rejects malformed values", () => {
    expect(readFeedback({ 4: "more", 5: "invalid", "-1": "less" })).toEqual([[4, "more"]]);
    expect(readFeedback(null)).toEqual([]);
    expect(readFeedback([[1, "more"], [1, "less"], ["bad", "more"]])).toEqual([[1, "less"]]);
  });
  it("keeps the newest 50 choices even when the newest ID is small", () => {
    const previous: FeedbackEntry[] = Array.from({ length: 50 }, (_, i) => [100 + i, "more"]);
    const next = updateFeedback(previous, 1, "less");
    expect(next).toHaveLength(50);
    expect(next.at(-1)).toEqual([1, "less"]);
    expect(next[0][0]).toBe(101);
    expect(readFeedback(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
  it("supports replacing and undoing feedback", () => {
    expect(updateFeedback([[1, "more"], [2, "less"]], 1, "less")).toEqual([[2, "less"], [1, "less"]]);
    expect(updateFeedback([[1, "more"]], 1, null)).toEqual([]);
  });
});
