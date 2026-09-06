import { expect, it } from "vitest";
import { buildShareResult } from "@/lib/share-result";
import type { GuessResult } from "@/types";

const guesses = [
  {
    guess: { title: "Secret answer" },
    attemptNumber: 2,
    comparison: [{ status: "exact" }],
  },
  {
    guess: { title: "Wrong title" },
    attemptNumber: 1,
    comparison: [{ status: "miss" }, { status: "partial" }],
  },
] as GuessResult[];
it("shares attempts in chronological order with no film titles", () => {
  const text = buildShareResult(
    "2026-09-06",
    true,
    guesses,
    "https://showle.example",
    "pl",
  );
  expect(text).toContain("2/7\n⬛🟨\n🟩");
  expect(text).not.toContain("Secret answer");
  expect(text).not.toContain("Wrong title");
  expect(text).toContain("https://showle.example/play/movie");
});
it("marks losses, including zero-guess surrender, as X/7", () => {
  expect(
    buildShareResult("2026-09-06", false, [], "https://showle.example", "en"),
  ).toContain("X/7");
});
