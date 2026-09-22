import { prisma } from "@/lib/prisma";
import { socialCard, socialCardSelect, friendshipState, type SocialRecord } from "@/lib/social";
import type { SocialPerson, SocialSummary } from "@/types/social";

export async function getSocialSummary(userId: string): Promise<SocialSummary> {
  const [friendships, following, followers] = await Promise.all([
    prisma.userFriendship.findMany({ where: { OR: [{ lowId: userId }, { highId: userId }] }, orderBy: { updatedAt: "desc" }, include: { low: { select: socialCardSelect }, high: { select: socialCardSelect } } }),
    prisma.userFollow.findMany({ where: { followerId: userId }, orderBy: { createdAt: "desc" }, include: { following: { select: socialCardSelect } } }),
    prisma.userFollow.findMany({ where: { followingId: userId }, orderBy: { createdAt: "desc" }, include: { follower: { select: socialCardSelect } } }),
  ]);
  const friendById = new Map(friendships.map((friendship) => [friendship.lowId === userId ? friendship.highId : friendship.lowId, friendship]));
  const followingIds = new Set(following.map((edge) => edge.followingId));
  const followerIds = new Set(followers.map((edge) => edge.followerId));
  const person = (profile: SocialRecord): SocialPerson => ({ ...socialCard(profile, friendById.get(profile.userId)?.status === "accepted"), relationship: {
    isSelf: false, isFollowing: followingIds.has(profile.userId), followsYou: followerIds.has(profile.userId),
    friendship: friendshipState(friendById.get(profile.userId) ?? null, userId),
  } });
  const friends = friendships.map((friendship) => person(friendship.lowId === userId ? friendship.high : friendship.low));
  return {
    friends: friends.filter((entry) => entry.relationship.friendship === "friends"),
    incoming: friends.filter((entry) => entry.relationship.friendship === "incoming"),
    outgoing: friends.filter((entry) => entry.relationship.friendship === "outgoing"),
    following: following.map((edge) => person(edge.following)), followers: followers.map((edge) => person(edge.follower)),
  };
}

export async function searchSocialProfiles(userId: string, query: string) {
  const q = query.trim();
  if (q.length < 2) return { people: [] };
  if (q.length > 80) return { people: [] };
  const [profiles, summary] = await Promise.all([
    prisma.userProfile.findMany({ where: { isPublic: true, userId: { not: userId }, displayName: { contains: q, mode: "insensitive" } }, orderBy: [{ displayName: "asc" }, { publicSlug: "asc" }], take: 12, select: socialCardSelect }),
    getSocialSummary(userId),
  ]);
  const known = new Map(Object.values(summary).flat().map((person) => [person.publicSlug, person]));
  return { people: profiles.map((profile): SocialPerson => ({ ...socialCard(profile), relationship: known.get(profile.publicSlug)?.relationship ?? { isSelf: false, isFollowing: false, followsYou: false, friendship: "none" } })) };
}
