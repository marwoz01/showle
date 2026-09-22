import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { updateSocialRelationship } from "@/lib/social-mutations";
import { getSocialSummary, searchSocialProfiles } from "@/lib/social-queries";
import { getSocialFeed } from "@/lib/social-feed";
import { canReadSocialProfile, getSocialPerson, socialPair } from "@/lib/social";
import { deleteProfileData, exportProfileData } from "@/lib/user-profile-data";

export function socialPostgresCases(client: () => PrismaClient) {
  const seed = async () => {
    for (const userId of ["viewer", "friend", "third"]) await client().userProfile.create({ data: { userId, publicSlug: `invite-${userId}`, displayName: `Movie ${userId}`, bio: `Private bio ${userId}` } });
  };
  const befriend = async (first = "viewer", second = "friend") => {
    await updateSocialRelationship(first, `invite-${second}`, "request");
    await updateSocialRelationship(second, `invite-${first}`, "accept");
  };
  describe("social relationships on the checked-in PostgreSQL migration", () => {
    it("creates private friends-only defaults and excludes private people from search and invite biography", async () => {
      await seed();
      const person = await getSocialPerson("viewer", "invite-friend");
      expect(person).toMatchObject({ displayName: "Movie friend", bio: "", relationship: { friendship: "none" } });
      expect(JSON.stringify(person)).not.toMatch(/userId|favoriteMovies|providerIds/);
      expect(await searchSocialProfiles("viewer", "Movie")).toEqual({ people: [] });
      await client().userProfile.update({ where: { userId: "friend" }, data: { isPublic: true } });
      expect((await searchSocialProfiles("viewer", "Movie")).people.map((profile) => profile.publicSlug)).toEqual(["invite-friend"]);
      expect((await client().userProfile.findUniqueOrThrow({ where: { userId: "friend" } })).activityVisibility).toBe("friends");
    });
    it("serializes reciprocal requests without implicitly accepting and enforces requester/recipient actions", async () => {
      await seed();
      const requests = await Promise.allSettled([updateSocialRelationship("viewer", "invite-friend", "request"), updateSocialRelationship("friend", "invite-viewer", "request")]);
      expect(requests.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const edge = await client().userFriendship.findFirstOrThrow();
      expect(edge.status).toBe("pending");
      const recipient = edge.requesterId === "viewer" ? "friend" : "viewer";
      await expect(updateSocialRelationship(edge.requesterId, `invite-${recipient}`, "accept")).rejects.toThrow("no_incoming_request");
      await expect(updateSocialRelationship(recipient, `invite-${edge.requesterId}`, "cancel")).rejects.toThrow("invalid_relationship_action");
      await updateSocialRelationship(recipient, `invite-${edge.requesterId}`, "accept");
      const friend = await client().userProfile.findUniqueOrThrow({ where: { userId: "friend" } });
      expect(await canReadSocialProfile(friend, "viewer")).toBe(true);
      expect((await getSocialSummary("viewer")).friends[0]).toMatchObject({ bio: "Private bio friend", relationship: { friendship: "friends" } });
      await updateSocialRelationship("viewer", "invite-friend", "remove");
      expect(await canReadSocialProfile(friend, "viewer")).toBe(false);
    });
    it("gates follow and feed by current privacy, never sharing watchlist or reviews", async () => {
      await seed();
      await expect(updateSocialRelationship("viewer", "invite-third", "follow")).rejects.toThrow("private_profile");
      await client().userProfile.update({ where: { userId: "third" }, data: { isPublic: true, activityVisibility: "public" } });
      await befriend();
      await updateSocialRelationship("viewer", "invite-third", "follow");
      await updateSocialRelationship("viewer", "invite-third", "follow");
      expect(await client().userFollow.count()).toBe(1);
      for (const userId of ["friend", "third"]) {
        for (const [tmdbId, category] of [[1, "watched"], [2, "watchlist"]] as const) await client().savedMovie.create({ data: { userId, tmdbId, title: `${userId}-${category}`, year: 2001, posterPath: "", genres: [], category, rating: 8, review: "private review" } });
      }
      const feed = await getSocialFeed("viewer");
      expect(feed.activity).toHaveLength(2);
      expect(feed.activity.every((activity) => activity.kind === "rating")).toBe(true);
      expect(JSON.stringify(feed)).not.toMatch(/userId|review|watchlist/);
      expect((await getSocialFeed(null, "invite-third")).activity).toHaveLength(1);
      await expect(getSocialFeed(null, "invite-friend")).rejects.toThrow("not_found");
      await expect(getSocialFeed(null)).rejects.toThrow("unauthorized");
      await client().userProfile.update({ where: { userId: "third" }, data: { isPublic: false } });
      await client().userProfile.update({ where: { userId: "friend" }, data: { activityVisibility: "private" } });
      expect((await getSocialFeed("viewer")).activity).toEqual([]);
      expect((await getSocialSummary("viewer")).following[0].bio).toBe("");
      await updateSocialRelationship("viewer", "invite-third", "unfollow");
      expect(await client().userFollow.count()).toBe(0);
    });
    it("exports both edge directions, cascades only a reset user's relationships and prevents dangling writes", async () => {
      await seed();
      await client().userProfile.updateMany({ data: { isPublic: true } });
      await befriend(); await befriend("friend", "third");
      await updateSocialRelationship("viewer", "invite-friend", "follow");
      await updateSocialRelationship("third", "invite-viewer", "follow");
      const exported = await exportProfileData("viewer");
      expect(exported.follows).toHaveLength(2); expect(exported.friendships).toHaveLength(1);
      await Promise.allSettled([updateSocialRelationship("third", "invite-viewer", "request"), deleteProfileData("viewer")]);
      expect(await client().userProfile.findUnique({ where: { userId: "viewer" } })).toBeNull();
      expect(await client().userFollow.count()).toBe(0);
      expect(await client().userFriendship.findMany()).toMatchObject([{ ...socialPair("friend", "third"), status: "accepted" }]);
      expect(await client().userProfile.count()).toBe(2);
    });
    it("enforces pair, self and state invariants in PostgreSQL itself", async () => {
      await seed();
      await expect(client().userFollow.create({ data: { followerId: "viewer", followingId: "viewer" } })).rejects.toThrow();
      await expect(client().userFriendship.create({ data: { lowId: "viewer", highId: "friend", requesterId: "viewer" } })).rejects.toThrow();
      await expect(client().userFriendship.create({ data: { ...socialPair("friend", "viewer"), requesterId: "third" } })).rejects.toThrow();
      await expect(client().userProfile.update({ where: { userId: "viewer" }, data: { activityVisibility: "everyone" } })).rejects.toThrow();
    });
  });
}
