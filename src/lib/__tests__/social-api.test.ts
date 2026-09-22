import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => {
  const delegate = () => ({ findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() });
  const db = { userProfile: delegate(), userFriendship: delegate(), userFollow: delegate(), savedMovie: delegate(), $executeRaw: vi.fn() };
  return { userId: "viewer" as string | null, allowed: true, db, transaction: vi.fn(), createProfile: vi.fn() };
});
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: mocks.allowed }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks.db, $transaction: mocks.transaction } }));
vi.mock("@/lib/user-profile", () => ({ getOrCreateUserProfile: mocks.createProfile }));
import { GET as summary } from "@/app/api/social/route";
import { GET as search } from "@/app/api/social/search/route";
import { GET as person, POST as mutate } from "@/app/api/social/relationship/route";
import { GET as feed } from "@/app/api/social/feed/route";
import { canReadSocialActivity, canReadSocialProfile, socialCard } from "@/lib/social";

const profile = { userId: "friend", publicSlug: "invite-friend", displayName: "Friend", avatarUrl: null, bio: "Private biography", isPublic: false, activityVisibility: "friends" };
const get = (path: string) => new NextRequest(`http://localhost/api/social${path}`);
const post = (body: unknown) => new Request("http://localhost/api/social/relationship", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); mocks.userId = "viewer"; mocks.allowed = true;
  for (const model of Object.values(mocks.db)) {
    if (typeof model === "function") continue;
    model.findUnique.mockResolvedValue(null); model.findMany.mockResolvedValue([]);
  }
  mocks.db.userProfile.findUnique.mockImplementation(async ({ where }: { where: { userId?: string } }) => where.userId ? { ...profile, userId: where.userId } : profile);
  mocks.transaction.mockImplementation(async (callback: (tx: typeof mocks.db) => Promise<unknown>) => callback(mocks.db));
});

describe("social authorization and privacy", () => {
  it("requires verified authentication for personal lists, relationship reads/actions and personal feed", async () => {
    mocks.userId = null;
    for (const response of await Promise.all([summary(), search(get("/search?q=Friend")), person(get("/relationship?slug=invite-friend")), mutate(post({ slug: "invite-friend", action: "request", userId: "victim" })), feed(get("/feed"))])) expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.db.userProfile.findUnique).not.toHaveBeenCalled();
  });
  it("exposes only minimal identity from a known private invitation before acceptance", async () => {
    const response = await person(get("/relationship?slug=invite-friend"));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).person).toMatchObject({ displayName: "Friend", bio: "", relationship: { friendship: "none" } });
    expect(socialCard(profile)).not.toHaveProperty("userId");
    expect(await canReadSocialProfile(profile, "viewer")).toBe(false);
    expect(await canReadSocialActivity(profile, "viewer")).toBe(false);
  });
  it("never grants friends-only visibility to follows or pending requests", async () => {
    mocks.db.userFollow.findUnique.mockResolvedValue({ followerId: "viewer", followingId: "friend" });
    mocks.db.userFriendship.findUnique.mockResolvedValue({ status: "pending", requesterId: "viewer" });
    expect(await canReadSocialProfile(profile, "viewer")).toBe(false);
    expect(await canReadSocialActivity(profile, "viewer")).toBe(false);
    mocks.db.userFriendship.findUnique.mockResolvedValue({ status: "accepted", requesterId: "viewer" });
    expect(await canReadSocialProfile(profile, "viewer")).toBe(true);
    expect(await canReadSocialActivity(profile, "viewer")).toBe(true);
    expect(await canReadSocialActivity({ ...profile, activityVisibility: "private" }, "viewer")).toBe(false);
    expect(await canReadSocialActivity({ ...profile, activityVisibility: "public" }, null)).toBe(false);
    expect(await canReadSocialActivity({ ...profile, isPublic: true, activityVisibility: "public" }, null)).toBe(true);
  });
  it("rejects invalid, oversized and rate-limited requests before a write", async () => {
    expect((await mutate(post({ slug: "../../victim", action: "follow" }))).status).toBe(400);
    expect((await mutate(post({ slug: "invite-friend", action: "delete" }))).status).toBe(400);
    expect((await mutate(post({ data: "x".repeat(2000) }))).status).toBe(413);
    mocks.allowed = false;
    expect((await mutate(post({ slug: "invite-friend", action: "request" }))).status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("derives both relationship parties from session and resolved slug, not body identities", async () => {
    const response = await mutate(post({ slug: "invite-friend", action: "request", userId: "victim", requesterId: "victim", targetId: "victim" }));
    expect(response.status).toBe(200);
    expect(mocks.db.userFriendship.create).toHaveBeenCalledWith({ data: { lowId: "friend", highId: "viewer", requesterId: "viewer" } });
    expect(mocks.db.$executeRaw).toHaveBeenCalledTimes(2);
  });
  it("prevents accepting one's own request and cancels only outgoing requests", async () => {
    mocks.db.userFriendship.findUnique.mockResolvedValue({ status: "pending", requesterId: "viewer" });
    expect((await mutate(post({ slug: "invite-friend", action: "accept" }))).status).toBe(409);
    expect((await mutate(post({ slug: "invite-friend", action: "decline" }))).status).toBe(409);
    expect((await mutate(post({ slug: "invite-friend", action: "cancel" }))).status).toBe(200);
    expect(mocks.db.userFriendship.update).not.toHaveBeenCalled();
  });
  it("rechecks activity sharing after reading watched movies and drops revoked authors", async () => {
    mocks.db.userProfile.findMany.mockResolvedValueOnce([profile]).mockResolvedValueOnce([]);
    mocks.db.savedMovie.findMany.mockResolvedValue([{ id: "row", userId: "friend", tmdbId: 1, title: "Film", year: 2001, posterPath: "", rating: 8, updatedAt: new Date() }]);
    const response = await feed(get("/feed"));
    expect(await response.json()).toEqual({ activity: [] });
    expect(mocks.db.savedMovie.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: { in: ["friend"] }, category: "watched" }, take: 30 }));
    expect(mocks.db.userProfile.findMany).toHaveBeenCalledTimes(2);
  });
  it("allows anonymous public activity only through a profile slug and public visibility filter", async () => {
    mocks.userId = null;
    mocks.db.userProfile.findUnique.mockResolvedValue({ ...profile, isPublic: true });
    expect((await feed(get("/feed?slug=invite-friend"))).status).toBe(200);
    expect(mocks.db.userProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { publicSlug: "invite-friend", isPublic: true, activityVisibility: "public" } }));
  });
});
