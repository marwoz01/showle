import { describe, expect, it } from "vitest";
import { resolveStreak } from "@/lib/streak";
describe("daily streak reconciliation", () => {
  it("keeps yesterday's streak without consuming a freeze", () => {
    expect(resolveStreak({ currentStreak: 5, lastPlayedDate: "2026-09-06" }, 2, "2026-09-07")).toMatchObject({ currentStreak: 5, freezesUsed: 0 });
  });
  it("projects a broken streak before the user plays again", () => {
    expect(resolveStreak({ currentStreak: 5, lastPlayedDate: "2026-09-05" }, 0, "2026-09-07")).toMatchObject({ currentStreak: 0, missedDays: 1 });
  });
  it("uses exactly the freezes needed to cover missed days", () => {
    expect(resolveStreak({ currentStreak: 5, lastPlayedDate: "20260904" }, 3, "2026-09-07")).toEqual({ currentStreak: 5, freezesUsed: 2, missedDays: 2, lastPlayedDate: "2026-09-06" });
  });
  it("does not waste insufficient freezes or spend on an already broken streak", () => {
    expect(resolveStreak({ currentStreak: 5, lastPlayedDate: "2026-09-04" }, 1, "2026-09-07")).toMatchObject({ currentStreak: 0, freezesUsed: 0 });
    expect(resolveStreak({ currentStreak: 0, lastPlayedDate: "2026-09-04" }, 3, "2026-09-07")).toMatchObject({ currentStreak: 0, freezesUsed: 0 });
  });
  it.each([["2026-03-28", "2026-03-30"], ["2026-10-24", "2026-10-26"]])("counts calendar days across daylight saving (%s)", (lastPlayedDate, today) => {
    expect(resolveStreak({ currentStreak: 5, lastPlayedDate }, 1, today)).toMatchObject({ currentStreak: 5, freezesUsed: 1, missedDays: 1 });
  });
  it("leaves today's completed game intact", () => {
    expect(resolveStreak({ currentStreak: 6, lastPlayedDate: "2026-09-07" }, 1, "2026-09-07")).toMatchObject({ currentStreak: 6, freezesUsed: 0 });
  });
});
