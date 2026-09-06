import { describe, expect, it } from "vitest";
import { getGuessReceipt, getRevealedFields } from "@/lib/daily-game-feedback";
import { mobileGame } from "@/lib/__tests__/fixtures/daily-mobile";

describe("daily game submission feedback", () => {
  it("confirms only a guess present in the server response", () => {
    expect(getGuessReceipt(mobileGame(1), mobileGame(2), 2)).toEqual({
      kind: "accepted", movieId: 2, attemptNumber: 2, hintsUnlocked: 1,
    });
    expect(getGuessReceipt(mobileGame(1), mobileGame(1), 2)).toBeNull();
  });
  it("does not announce a failed or superseded request as saved", () => {
    expect(getGuessReceipt(mobileGame(), undefined, 1)).toBeNull();
  });
  it("does not carry confirmation into another daily challenge", () => {
    const tomorrow = { ...mobileGame(1), dateKey: "2026-09-07" };
    expect(getGuessReceipt(mobileGame(), tomorrow, 1)).toBeNull();
  });
  it("identifies duplicates without claiming a new guess or hint", () => {
    expect(getGuessReceipt(mobileGame(2), mobileGame(2), 1)).toEqual({
      kind: "duplicate", movieId: 1, attemptNumber: 1, hintsUnlocked: 0,
    });
  });
  it("does not rely on the returned guess order", () => {
    const next = mobileGame(3);
    next.guesses.reverse();
    expect(getGuessReceipt(mobileGame(2), next, 3)?.attemptNumber).toBe(3);
  });
  it("accepts the last guess when it ends the game", () => {
    const next = { ...mobileGame(7), status: "lost" as const };
    expect(getGuessReceipt(mobileGame(6), next, 7)?.kind).toBe("accepted");
  });
});

describe("mobile revealed clues", () => {
  it("collects exact matches across attempts without duplicates or mutation", () => {
    const game = mobileGame(3);
    game.guesses[2].comparison[0] = { ...game.guesses[2].comparison[0], status: "exact", answerValue: "2004" };
    const before = structuredClone(game);
    const revealed = getRevealedFields(game.guesses);
    expect(revealed).toHaveLength(3);
    expect(revealed.map((field) => field.answerValue)).toContain("2004");
    expect(game).toEqual(before);
  });
  it("never displays hidden or non-exact answers", () => {
    const game = mobileGame(1);
    game.guesses[0].comparison[0].answerValue = "SECRET YEAR";
    game.guesses[0].comparison[1].answerValue = "SECRET GENRE";
    game.guesses[0].comparison[7].answerValue = "";
    const revealed = getRevealedFields(game.guesses);
    expect(revealed).toHaveLength(1);
    expect(JSON.stringify(revealed)).not.toContain("SECRET");
    expect(getRevealedFields([])).toEqual([]);
  });
});
