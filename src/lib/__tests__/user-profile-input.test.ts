import { describe, expect, it } from "vitest";
import { parsePreferencePatch, parseProfilePatch } from "@/lib/user-profile-input";

const current = { genres: ["Drama"], excludedGenres: ["Horror"], providerIds: [8], maxRuntime: 120 };

describe("profile input validation", () => {
  it("accepts a bounded explicit public profile and strips untrusted identity fields", () => {
    expect(parseProfilePatch({ userId: "victim", avatarUrl: "https://attacker.example", displayName: "  Kinoman  ", isPublic: true, favoriteMovieIds: [1, 2] })).toEqual({ displayName: "Kinoman", isPublic: true, favoriteMovieIds: [1, 2] });
  });
  it.each([{ displayName: " " }, { displayName: "x".repeat(41) }, { displayName: "a\nb" }, { bio: "x".repeat(281) }, { isPublic: "yes" }, { favoriteMovieIds: [1, 1] }, { favoriteMovieIds: [1, 2, 3, 4, 5] }, { favoriteMovieIds: [0] }, { favoriteMovieIds: [2147483648] }, []])("rejects invalid profile input %#", (input) => {
    expect(() => parseProfilePatch(input)).toThrow();
  });
  it("allows clearing all favorites", () => {
    expect(parseProfilePatch({ favoriteMovieIds: [] })).toEqual({ favoriteMovieIds: [] });
  });
  it("keeps omitted preferences untouched, including when changing only the language", () => {
    expect(parsePreferencePatch({ locale: "en" }, current)).toEqual({ locale: "en" });
    expect(parsePreferencePatch({ maxRuntime: null }, current)).toEqual({ maxRuntime: null });
  });
  it("rejects overlap with retained settings but allows atomic moves between genre lists", () => {
    expect(() => parsePreferencePatch({ genres: ["Horror"] }, current)).toThrow("conflicting_genres");
    expect(parsePreferencePatch({ genres: ["Horror"], excludedGenres: [] }, current)).toEqual({ genres: ["Horror"], excludedGenres: [] });
  });
  it.each([{ providerIds: [999] }, { providerIds: [8, 8] }, { genres: ["invented"] }, { genres: ["Drama", "Drama"] }, { maxRuntime: 39 }, { maxRuntime: 361 }, { maxRuntime: 50.5 }, { locale: "de" }, { userId: "victim" }])("rejects invalid preferences %#", (input) => {
    expect(() => parsePreferencePatch(input, current)).toThrow();
  });
});
