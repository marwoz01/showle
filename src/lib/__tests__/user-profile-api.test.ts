import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const delegate = () => ({ findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() });
  const db = {
    userProfile: delegate(), savedMovie: delegate(), rankedList: delegate(), gameResult: delegate(), userStats: delegate(),
    userFollow: delegate(), userFriendship: delegate(),
    recommendationFeedback: delegate(), userWallet: delegate(), coinTransaction: delegate(), higherLowerRecord: delegate(), dailyUsage: delegate(), recommendationMovie: delegate(),
    $executeRaw: vi.fn(),
  };
  return { userId: "viewer" as string | null, cookieLocale: undefined as string | undefined, db, transaction: vi.fn(), currentUser: vi.fn(), details: vi.fn() };
});
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }), currentUser: mocks.currentUser }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name === "showle-locale" && mocks.cookieLocale ? { value: mocks.cookieLocale } : undefined }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks.db, $transaction: mocks.transaction } }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: true }) }));
vi.mock("@/lib/tmdb", () => ({ getMovieDetails: mocks.details }));

import { GET, PATCH } from "@/app/api/profile/route";
import { GET as preferencesGet, PATCH as preferencesPatch, POST as feedbackReset } from "@/app/api/profile/preferences/route";
import { GET as exportGet } from "@/app/api/profile/export/route";
import { DELETE } from "@/app/api/profile/data/route";
import { collectionCsv } from "@/lib/user-profile-data";
import { getOrCreateUserProfile } from "@/lib/user-profile";

const profile = {
  userId: "viewer", publicSlug: "random-public-slug", displayName: "Kinoman", bio: "Hi", isPublic: false, avatarUrl: null,
  favoriteMovieIds: [1], favoriteMovies: [{ id: 1, title: "Film", year: 2000, posterPath: "/film.jpg" }],
  providerIds: [8], genres: ["Drama"], excludedGenres: ["Horror"], maxRuntime: 120, locale: "pl", createdAt: new Date(), updatedAt: new Date(),
};
const request = (method: string, body?: unknown, suffix = "") => new Request(`http://localhost/api/profile${suffix}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.userId = "viewer";
  mocks.cookieLocale = undefined;
  for (const model of Object.values(mocks.db)) {
    if (typeof model === "function") continue;
    model.findMany.mockResolvedValue([]); model.findUnique.mockResolvedValue(null); model.count.mockResolvedValue(0); model.deleteMany.mockResolvedValue({ count: 1 });
  }
  mocks.transaction.mockImplementation(async (callback: (tx: typeof mocks.db) => Promise<unknown>) => callback(mocks.db));
  mocks.currentUser.mockResolvedValue({ id: "viewer", username: "Name", imageUrl: null });
  mocks.db.userProfile.findUnique.mockResolvedValue(profile);
  mocks.db.userProfile.findUniqueOrThrow.mockResolvedValue(profile);
  mocks.db.userProfile.update.mockImplementation(async ({ data }: { data: object }) => ({ ...profile, ...data }));
  mocks.db.userProfile.upsert.mockImplementation(async ({ create }: { create: object }) => ({ ...profile, ...create }));
});

describe("authenticated profile APIs", () => {
  it("keeps a new English user's selected language and uses a localized fallback name", async () => {
    mocks.cookieLocale = "en";
    mocks.db.userProfile.findUnique.mockResolvedValue(null);
    mocks.currentUser.mockResolvedValue({ id: "viewer", username: null, firstName: null, emailAddresses: [{ emailAddress: "private@example.com" }], imageUrl: null });
    expect(await getOrCreateUserProfile("viewer")).toMatchObject({ locale: "en", displayName: "Movie lover", isPublic: false });
  });
  it("defaults to Polish for an unsupported cookie without overwriting an existing saved locale", async () => {
    mocks.cookieLocale = "fr";
    mocks.db.userProfile.findUnique.mockResolvedValue(null);
    expect(await getOrCreateUserProfile("viewer")).toMatchObject({ locale: "pl" });
    mocks.cookieLocale = "en";
    mocks.db.userProfile.findUnique.mockResolvedValue(profile);
    expect(await getOrCreateUserProfile("viewer")).toMatchObject({ locale: "pl" });
  });
  it("requires authentication before all private reads and writes", async () => {
    mocks.userId = null;
    const responses = await Promise.all([GET(), PATCH(request("PATCH", { displayName: "X" })), preferencesGet(), preferencesPatch(request("PATCH", { genres: [] })), feedbackReset(request("POST", { action: "reset-feedback" })), exportGet(request("GET")), DELETE(request("DELETE", { confirmation: "DELETE SHOWLE DATA" }))]);
    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.db.userProfile.findUnique).not.toHaveBeenCalled();
  });
  it("returns a private whitelist rather than database identity fields", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const json = await response.json();
    expect(json.profile).toMatchObject({ displayName: "Kinoman", locale: "pl", preferences: { providerIds: [8] } });
    expect(json.profile).not.toHaveProperty("userId");
    expect(json.profile).not.toHaveProperty("favoriteMovieIds");
    expect(json.badges).toHaveLength(5);
    expect(mocks.db.savedMovie.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "viewer" }) }));
  });
  it("never accepts a client-supplied identity, avatar or favorite metadata", async () => {
    mocks.db.recommendationMovie.findMany.mockResolvedValue([{ tmdbId: 2, title: "Verified", titlePl: "Film", year: 2001, posterPath: "/verified.jpg" }]);
    const response = await PATCH(request("PATCH", { userId: "victim", avatarUrl: "https://fake.example", favoriteMovieIds: [2], favoriteMovies: [{ id: 2, title: "Fake" }] }));
    expect(response.status).toBe(200);
    expect(mocks.db.userProfile.update).toHaveBeenCalledWith({ where: { userId: "viewer" }, data: { favoriteMovieIds: [2], favoriteMovies: [{ id: 2, title: "Film", year: 2001, posterPath: "/verified.jpg" }] } });
  });
  it("does not write if a favorite film cannot be verified", async () => {
    mocks.details.mockResolvedValue(null);
    expect((await PATCH(request("PATCH", { favoriteMovieIds: [42] }))).status).toBe(404);
    expect(mocks.db.userProfile.update).not.toHaveBeenCalled();
  });
  it("changes only provided preferences and removes only owned feedback", async () => {
    const response = await preferencesPatch(request("PATCH", { locale: "en", userId: "victim" }));
    expect(response.status).toBe(200);
    expect(mocks.db.userProfile.update).toHaveBeenCalledWith({ where: { userId: "viewer" }, data: { locale: "en" } });
    expect(await response.json()).toMatchObject({ locale: "en", preferences: { providerIds: [8], genres: ["Drama"] } });
    expect((await feedbackReset(request("POST", { action: "reset-feedback", userId: "victim" }))).status).toBe(200);
    expect(mocks.db.recommendationFeedback.deleteMany).toHaveBeenCalledWith({ where: { userId: "viewer" } });
  });
  it("requires explicit deletion confirmation, then deletes only app data owned by the session", async () => {
    expect((await DELETE(request("DELETE", {}))).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    const response = await DELETE(request("DELETE", { confirmation: "DELETE SHOWLE DATA", userId: "victim" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("showle-player=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    for (const name of ["rankedList", "savedMovie", "gameResult", "userStats", "recommendationFeedback", "coinTransaction", "userWallet", "higherLowerRecord", "userProfile"] as const) {
      expect(mocks.db[name].deleteMany).toHaveBeenCalledWith({ where: { userId: "viewer" } });
    }
    expect(mocks.db.dailyUsage.deleteMany).toHaveBeenCalledWith({ where: { key: { startsWith: "recommend:viewer:" } } });
  });
  it("exports every collection row and all ranking items in an owned consistent snapshot", async () => {
    mocks.db.savedMovie.findMany.mockResolvedValue(Array.from({ length: 25 }, (_, tmdbId) => ({ tmdbId })));
    const response = await exportGet(request("GET", undefined, "/export?format=json"));
    expect(response.status).toBe(200);
    expect((await response.json()).collection).toHaveLength(25);
    expect(mocks.db.savedMovie.findMany).toHaveBeenCalledWith({ where: { userId: "viewer" }, orderBy: { createdAt: "asc" } });
    expect(mocks.db.rankedList.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "viewer" }, include: { items: { orderBy: { position: "asc" } } } }));
    expect(response.headers.get("content-disposition")).toContain("attachment;");
  });
  it("does not reveal the answer to an unfinished daily game through a personal export", async () => {
    mocks.db.gameResult.findMany.mockResolvedValue([{ status: "playing", guessIds: [1], targetMovieId: 42, targetTitle: "Hidden answer", targetYear: 2001, targetPoster: "/hidden.jpg" }]);
    const response = await exportGet(request("GET", undefined, "/export?format=json"));
    expect((await response.json()).history).toEqual([{ status: "playing", guessIds: [1], targetMovieId: null, targetTitle: "", targetYear: null, targetPoster: "" }]);
  });
  it("neutralizes CSV formulas even after whitespace and correctly quotes multiline reviews", () => {
    const csv = collectionCsv([{ tmdbId: 1, title: " =HYPERLINK(\"https://evil.example\")", year: 2000, category: "watched", genres: ["Drama"], director: "@SUM(1)", runtime: 100, rating: 8, review: "Line 1\n\"Line 2\"", watchedAt: null, createdAt: new Date("2026-01-01Z") }]);
    expect(csv).toContain('"\' =HYPERLINK(""https://evil.example"")"');
    expect(csv).toContain('"\'@SUM(1)"');
    expect(csv).toContain('"Line 1\n""Line 2"""');
  });
  it("enforces input size before profile writes", async () => {
    expect((await PATCH(request("PATCH", { bio: "x".repeat(5000) }))).status).toBe(413);
    expect(mocks.db.userProfile.update).not.toHaveBeenCalled();
  });
});
