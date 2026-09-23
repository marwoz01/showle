import { describe, expect, it } from "vitest";
import { compareGuessCast } from "@/lib/cast-comparison";

const cast = (...names: string[]) => names.map((name) => ({ name, character: "", profilePath: "" }));
describe("daily actors matched across the full answer cast", () => {
  it("matches supporting and lower-billed actors without requiring the same role", () => {
    expect(compareGuessCast(
      { leadActor: "Supporting actor", cast: cast("Supporting actor", "Answer lead", "Actor 12", "Absent actor") },
      { leadActor: "Answer lead", cast: cast("Answer lead", "Supporting actor") },
      ["Answer lead", "Supporting actor", ...Array.from({ length: 12 }, (_, index) => `Actor ${index + 1}`)],
    )).toEqual([
      { name: "Supporting actor", status: "exact" },
      { name: "Answer lead", status: "exact" },
      { name: "Actor 12", status: "exact" },
      { name: "Absent actor", status: "miss" },
    ]);
  });
  it("normalizes case and whitespace, deduplicates people and excludes unknown names", () => {
    expect(compareGuessCast(
      { leadActor: "  JAKE   GYLLENHAAL ", cast: cast("Jake Gyllenhaal", "Unknown", " n/a ", "", "nieznany") },
      { leadActor: "Other actor" },
      ["Jake Gyllenhaal", "Other actor"],
    )).toEqual([{ name: "  JAKE   GYLLENHAAL ", status: "exact" }]);
  });
  it("marks every known guessed actor red when the full answer cast has no overlap", () => {
    expect(compareGuessCast({ leadActor: "First", cast: cast("Second") }, { leadActor: "Other" }, ["Other"]))
      .toEqual([{ name: "First", status: "miss" }, { name: "Second", status: "miss" }]);
  });
  it.each([undefined, [], ["Unknown"]])("does not infer absences from incomplete answer credits: %s", (names) => {
    expect(compareGuessCast(
      { leadActor: "Answer lead", cast: cast("Known support", "Uncertain") },
      { leadActor: "Answer lead", cast: cast("Known support") },
      names,
    )).toEqual([{ name: "Answer lead", status: "exact" }, { name: "Known support", status: "exact" }]);
  });
  it("never sends an unguessed answer actor", () => {
    const result = compareGuessCast({ leadActor: "Guess" }, { leadActor: "Secret lead" }, ["Secret lead", "Secret support"]);
    expect(result).toEqual([{ name: "Guess", status: "miss" }]);
    expect(JSON.stringify(result)).not.toContain("Secret");
  });
});
