import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDetails } from "@/types";
const mocks = vi.hoisted(() => ({ details: vi.fn() }));
vi.mock("@/lib/tmdb", () => ({ getMovieDetails: mocks.details }));
const answer = { id: 42, leadActor: "Lead" } as MediaDetails;
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });
afterEach(() => vi.restoreAllMocks());

describe("legacy daily cast enrichment", () => {
  it("uses full snapshot names without upstream work", async () => {
    const { getAnswerCastNames } = await import("@/lib/daily-cast");
    expect(await getAnswerCastNames("2026-09-24", { ...answer, castNames: ["Lead", "Lower billed"] })).toEqual(["lead", "lower billed"]);
    expect(mocks.details).not.toHaveBeenCalled();
  });
  it("deduplicates and caches a legacy answer lookup across requests", async () => {
    mocks.details.mockResolvedValue({ ...answer, castNames: ["Lead", "Lower billed"] });
    const { getAnswerCastNames } = await import("@/lib/daily-cast");
    const results = await Promise.all(Array.from({ length: 10 }, () => getAnswerCastNames("2026-09-24", answer)));
    expect(results.every((result) => result?.includes("lower billed"))).toBe(true);
    expect(await getAnswerCastNames("2026-09-24", answer)).toEqual(["lead", "lower billed"]);
    expect(mocks.details).toHaveBeenCalledExactlyOnceWith(42);
  });
  it.each([null, { ...answer, castNames: [] }, { ...answer, cast: [{ name: "Lead" }] }])("leaves missing or still-truncated credits uncertain", async (result) => {
    mocks.details.mockResolvedValue(result);
    const { getAnswerCastNames } = await import("@/lib/daily-cast");
    expect(await getAnswerCastNames("2026-09-24", answer)).toBeUndefined();
  });
  it("briefly caches failure and retries later without failing the game", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    mocks.details.mockRejectedValueOnce(new Error("upstream unavailable"));
    const { getAnswerCastNames } = await import("@/lib/daily-cast");
    expect(await getAnswerCastNames("2026-09-24", answer)).toBeUndefined();
    expect(await getAnswerCastNames("2026-09-24", answer)).toBeUndefined();
    expect(mocks.details).toHaveBeenCalledOnce();
    now.mockReturnValue(60_001);
    mocks.details.mockResolvedValue({ ...answer, castNames: ["Lead"] });
    expect(await getAnswerCastNames("2026-09-24", answer)).toEqual(["lead"]);
    expect(mocks.details).toHaveBeenCalledTimes(2);
  });
});
