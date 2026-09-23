import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ userId: "viewer" as string | null, allowed: true, profile: vi.fn(), friendship: vi.fn(), summary: vi.fn(), badges: vi.fn(), collection: vi.fn(), feedback: vi.fn(), catalog: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: mocks.allowed }) }));
vi.mock("@/lib/user-profile", () => ({ getProfileSummary: mocks.summary, getProfileBadges: mocks.badges }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  userProfile: { findUnique: mocks.profile }, savedMovie: { findMany: mocks.collection },
  userFriendship: { findUnique: mocks.friendship },
  recommendationFeedback: { findMany: mocks.feedback }, recommendationMovie: { findMany: mocks.catalog },
} }));
import { GET as publicProfile } from "@/app/api/profiles/[slug]/route";
import { GET as compare } from "@/app/api/profiles/[slug]/compare/route";

const params = { params: Promise.resolve({ slug: "public-friend" }) };
const request = () => new NextRequest("http://localhost/api/profiles/public-friend?userId=other-user");
const profile = { userId: "friend", isPublic: true, activityVisibility: "friends", publicSlug: "public-friend", displayName: "Friend", bio: "Hello", avatarUrl: null, favoriteMovies: [], genres: [], excludedGenres: [], providerIds: [], maxRuntime: null };

beforeEach(() => {
  vi.clearAllMocks(); mocks.userId = "viewer"; mocks.allowed = true;
  mocks.profile.mockResolvedValue(profile);
  mocks.friendship.mockResolvedValue(null);
  mocks.summary.mockResolvedValue({ watchedCount: 3, watchlistCount: 10, totalMinutes: 360, averageRating: 8,
    favoriteGenres: [], daily: { gamesPlayed: 3, gamesWon: 2, currentStreak: 0, maxStreak: 2, averageGuesses: 3 }, higherLowerBest: 5 });
  mocks.badges.mockReturnValue([]); mocks.collection.mockResolvedValue([]); mocks.feedback.mockResolvedValue([]); mocks.catalog.mockResolvedValue([]);
});

describe("public profile endpoints", () => {
  it("returns a no-store whitelist for public profiles", async () => {
    const response = await publicProfile(request(), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.profile.mock.calls[0][0].where).toEqual({ publicSlug: "public-friend" });
    const body = await response.json();
    expect(body.displayName).toBe("Friend");
    expect(JSON.stringify(body)).not.toMatch(/userId|watchlist|providerIds|excludedGenres|favoriteGenres|averageRating/);
  });
  it("makes a private or missing profile indistinguishable", async () => {
    mocks.profile.mockResolvedValue(null);
    const response = await publicProfile(request(), params);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(mocks.summary).not.toHaveBeenCalled();
  });
  it("rechecks an opt-out while aggregates are being calculated", async () => {
    mocks.profile.mockResolvedValueOnce(profile).mockResolvedValueOnce(null);
    expect((await publicProfile(request(), params)).status).toBe(404);
  });
  it("hides private profiles from strangers, pending requests and signed-out viewers", async () => {
    mocks.profile.mockResolvedValue({ ...profile, isPublic: false });
    expect((await publicProfile(request(), params)).status).toBe(404);
    mocks.friendship.mockResolvedValue({ status: "pending", requesterId: "viewer" });
    expect((await publicProfile(request(), params)).status).toBe(404);
    mocks.userId = null;
    expect((await publicProfile(request(), params)).status).toBe(404);
    expect(mocks.summary).not.toHaveBeenCalled();
  });
  it("permits accepted friends but discards aggregates after friendship removal", async () => {
    mocks.profile.mockResolvedValue({ ...profile, isPublic: false });
    mocks.friendship.mockResolvedValue({ status: "accepted" });
    expect((await publicProfile(request(), params)).status).toBe(200);
    mocks.friendship.mockResolvedValueOnce({ status: "accepted" }).mockResolvedValueOnce(null);
    expect((await publicProfile(request(), params)).status).toBe(404);
  });
  it("blocks invalid slugs and limited requests before database reads", async () => {
    expect((await publicProfile(request(), { params: Promise.resolve({ slug: "../../account" }) })).status).toBe(404);
    mocks.allowed = false;
    expect((await publicProfile(request(), params)).status).toBe(429);
    expect(mocks.profile).not.toHaveBeenCalled();
  });
});

describe("authenticated taste comparison", () => {
  it("requires sign-in before reading anyone's profile or collection", async () => {
    mocks.userId = null;
    expect((await compare(request(), params)).status).toBe(401);
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.collection).not.toHaveBeenCalled();
  });
  it("does not compare against private or own profiles", async () => {
    mocks.profile.mockResolvedValueOnce(null);
    expect((await compare(request(), params)).status).toBe(404);
    mocks.profile.mockResolvedValueOnce({ ...profile, userId: "viewer" });
    expect((await compare(request(), params)).status).toBe(409);
    expect(mocks.collection).not.toHaveBeenCalled();
  });
  it("derives the viewer from auth and returns neither raw private records nor preferences", async () => {
    mocks.collection.mockResolvedValue([{ tmdbId: 7, title: "Known", year: 2000, posterPath: "", genres: ["Drama"], rating: 9, category: "watched", review: "private review", userId: "private-owner" }]);
    const response = await compare(request(), params);
    expect(response.status).toBe(200);
    expect(mocks.collection.mock.calls[0][0].where).toEqual({ userId: "viewer" });
    expect(mocks.collection.mock.calls[1][0].where).toEqual({ userId: "friend" });
    expect(mocks.feedback.mock.calls[0][0].where).toEqual({ userId: { in: ["viewer", "friend"] }, reaction: "less" });
    const body = await response.json();
    expect(body.comparison.score).toBeNull();
    expect(body.comparison.sharedMovies).toHaveLength(0);
    expect(body.comparison.ratingDetailsVisible).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/private|review|userId|genres|providerIds|category/);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("drops the entire comparison if public sharing is disabled during the query", async () => {
    mocks.profile.mockResolvedValueOnce(profile).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const response = await compare(request(), params);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
  it("permits private friend comparison and rechecks accepted friendship", async () => {
    mocks.profile.mockResolvedValue({ ...profile, isPublic: false });
    mocks.friendship.mockResolvedValue({ status: "accepted" });
    expect((await compare(request(), params)).status).toBe(200);
    mocks.friendship.mockResolvedValueOnce({ status: "accepted" }).mockResolvedValueOnce(null);
    expect((await compare(request(), params)).status).toBe(404);
  });
  it.each([
    { visibility: "public", public: true, friendship: null, visible: true },
    { visibility: "friends", public: true, friendship: null, visible: false },
    { visibility: "friends", public: true, friendship: "pending", visible: false },
    { visibility: "friends", public: false, friendship: "accepted", visible: true },
    { visibility: "private", public: false, friendship: "accepted", visible: false },
  ])("respects $visibility activity for public=$public friendship=$friendship", async ({ visibility, public: isPublic, friendship, visible }) => {
    mocks.profile.mockResolvedValue({ ...profile, isPublic, activityVisibility: visibility });
    mocks.friendship.mockResolvedValue(friendship ? { status: friendship } : null);
    mocks.collection.mockResolvedValue([{ tmdbId: 7, title: "Known", year: 2000, posterPath: "", genres: [], rating: 9, category: "watched" }]);
    const response = await compare(request(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comparison.ratingDetailsVisible).toBe(visible);
    expect(body.comparison.similarRatings).toHaveLength(visible ? 1 : 0);
    expect(body.comparison.sharedMovies).toHaveLength(visible ? 1 : 0);
    expect(body.comparison.averageRatingGap).toBe(visible ? 0 : null);
  });
  it("rechecks activity privacy after retrieving ratings", async () => {
    mocks.profile.mockResolvedValueOnce({ ...profile, activityVisibility: "public" })
      .mockResolvedValueOnce(profile).mockResolvedValueOnce({ ...profile, activityVisibility: "private" });
    mocks.collection.mockResolvedValue([{ tmdbId: 7, title: "Known", year: 2000, posterPath: "", genres: [], rating: 9, category: "watched" }]);
    const response = await compare(request(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comparison.ratingDetailsVisible).toBe(false);
    expect(body.comparison.similarRatings).toEqual([]);
  });
  it("hides rated watchlist titles even when activity is public", async () => {
    mocks.profile.mockResolvedValue({ ...profile, activityVisibility: "public" });
    mocks.collection.mockResolvedValueOnce([{ tmdbId: 7, title: "Known", year: 2000, posterPath: "", genres: [], rating: 9, category: "watched" }])
      .mockResolvedValueOnce([{ tmdbId: 7, title: "Private watchlist metadata", year: 2000, posterPath: "", genres: [], rating: 9, category: "watchlist" }]);
    const body = await (await compare(request(), params)).json();
    expect(body.comparison.ratingDetailsVisible).toBe(true);
    expect(body.comparison.sharedRatingCount).toBe(1);
    expect(body.comparison.similarRatings).toEqual([]);
    expect(body.comparison.sharedMovies).toEqual([]);
    expect(body.comparison.averageRatingGap).toBeNull();
    expect(body.comparison.agreementCount).toBeNull();
    expect(JSON.stringify(body)).not.toContain("Private watchlist metadata");
  });
});
