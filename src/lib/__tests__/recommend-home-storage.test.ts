import { describe, expect, it } from "vitest";
import { GUEST_PREFERENCES_KEY, readGuestPreferences, serializeGuestPreferences } from "@/lib/recommend-home-storage";
import { parseHomePicks } from "@/lib/recommend-home-response";

const preferences = { favoriteIds: [603, 550], providerIds: [8, 337], onboarded: true };
const pick = (id: number) => ({ movie: { id, title: `Film ${id}`, genres: ["Drama"], runtime: 90, posterPath: "/poster.jpg" }, justification: "A thoughtful story." });

describe("personal recommendation persistence", () => {
  it("round-trips the explicitly versioned guest settings without storing account identity", () => {
    const serialized = serializeGuestPreferences(preferences);
    expect(readGuestPreferences(serialized)).toEqual(preferences);
    expect(GUEST_PREFERENCES_KEY).toBe("showle-recommend-preferences:guest:v1");
    expect(JSON.parse(serialized)).toEqual({ version: 1, preferences });
  });
  it.each([null, "", "broken JSON", "null", "[]", JSON.stringify(preferences),
    JSON.stringify({ version: 2, preferences }), "x".repeat(4001)])("ignores unsupported or corrupted browser storage (%s)", (value) => {
    expect(readGuestPreferences(value)).toBeNull();
  });
  it.each([
    { ...preferences, favoriteIds: [603, 603] }, { ...preferences, favoriteIds: ["603"] },
    { ...preferences, favoriteIds: Array.from({ length: 13 }, (_, i) => i + 1) },
    { ...preferences, favoriteIds: [-1] }, { ...preferences, providerIds: [999999] },
    { ...preferences, onboarded: "yes" },
  ])("rejects unsafe stored settings instead of submitting them", (value) => {
    expect(readGuestPreferences(JSON.stringify({ version: 1, preferences: value }))).toBeNull();
  });
  it("remembers an explicit opt-out of taste and service filtering", () => {
    const empty = { favoriteIds: [], providerIds: [], onboarded: true };
    expect(readGuestPreferences(serializeGuestPreferences(empty))).toEqual(empty);
  });
});

describe("personal recommendation response boundary", () => {
  it("shows at most three distinct valid movies even if a response is oversized", () => {
    const parsed = parseHomePicks({ recommendations: [pick(1), pick(1), null, pick(-1), pick(2), pick(3), pick(4)] });
    expect(parsed?.recommendations.map(({ movie }) => movie.id)).toEqual([1, 2, 3]);
  });
  it.each([null, [], {}, { recommendations: [] }, { recommendations: [pick(0), { movie: { id: 5 } }] }])("leaves empty or malformed results retryable", (value) => {
    expect(parseHomePicks(value)).toBeNull();
  });
  it("keeps partial and cold-start results honest while normalizing optional movie fields", () => {
    const parsed = parseHomePicks({ recommendations: [pick(42)], meta: { mode: "personal", personalized: false } });
    expect(parsed?.recommendations[0].movie).toMatchObject({ id: 42, title: "Film 42", runtime: 90, director: "", rating: 0 });
    expect(parsed?.meta).toMatchObject({ mode: "personal", partial: true, personalized: false });
  });
  it("does not render unexpected remote image paths or non-finite metadata", () => {
    const parsed = parseHomePicks({ recommendations: [{ ...pick(10), movie: { ...pick(10).movie, posterPath: "https://example.com/a.jpg", runtime: Infinity } }] });
    expect(parsed?.recommendations[0].movie).toMatchObject({ posterPath: "", runtime: 0 });
  });
});
