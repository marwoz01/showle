import type { Prisma, UserFriendship, UserProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProfileError } from "@/lib/user-profile-input";
import type { SocialPerson, SocialProfileCard, SocialRelationship } from "@/types/social";

export const socialCardSelect = { userId: true, publicSlug: true, displayName: true, bio: true, avatarUrl: true, isPublic: true } as const;
export type SocialRecord = Pick<UserProfile, keyof typeof socialCardSelect>;
export type SocialDatabase = Pick<Prisma.TransactionClient, "userProfile" | "userFriendship" | "userFollow">;

export function socialPair(first: string, second: string) {
  return first < second ? { lowId: first, highId: second } : { lowId: second, highId: first };
}

export function validSocialSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9-]{3,64}$/.test(slug);
}

export function socialCard(profile: SocialRecord, canReadPrivate = false): SocialProfileCard {
  return { publicSlug: profile.publicSlug, displayName: profile.displayName, bio: profile.isPublic || canReadPrivate ? profile.bio : "", avatarUrl: profile.avatarUrl, isPublic: profile.isPublic };
}

export function friendshipState(friendship: Pick<UserFriendship, "status" | "requesterId"> | null, viewer: string): SocialRelationship["friendship"] {
  if (!friendship) return "none";
  if (friendship.status === "accepted") return "friends";
  return friendship.requesterId === viewer ? "outgoing" : "incoming";
}

export async function getSocialRelationship(viewer: string, target: string, db: SocialDatabase = prisma): Promise<SocialRelationship> {
  const [following, follower, friendship] = await Promise.all([
    db.userFollow.findUnique({ where: { followerId_followingId: { followerId: viewer, followingId: target } } }),
    db.userFollow.findUnique({ where: { followerId_followingId: { followerId: target, followingId: viewer } } }),
    db.userFriendship.findUnique({ where: { lowId_highId: socialPair(viewer, target) } }),
  ]);
  return { isSelf: viewer === target, isFollowing: !!following, followsYou: !!follower, friendship: friendshipState(friendship, viewer) };
}

export async function getSocialPerson(viewer: string, slug: string, db: SocialDatabase = prisma): Promise<SocialPerson> {
  if (!validSocialSlug(slug)) throw new ProfileError("not_found", 404);
  const target = await db.userProfile.findUnique({ where: { publicSlug: slug }, select: socialCardSelect });
  if (!target) throw new ProfileError("not_found", 404);
  const relationship = await getSocialRelationship(viewer, target.userId, db);
  return { ...socialCard(target, relationship.isSelf || relationship.friendship === "friends"), relationship };
}

export async function canReadSocialProfile(profile: Pick<UserProfile, "userId" | "isPublic">, viewer: string | null, db: SocialDatabase = prisma): Promise<boolean> {
  if (profile.isPublic || viewer === profile.userId) return true;
  if (!viewer) return false;
  const friendship = await db.userFriendship.findUnique({ where: { lowId_highId: socialPair(viewer, profile.userId) } });
  return friendship?.status === "accepted";
}

export async function canReadSocialActivity(profile: Pick<UserProfile, "userId" | "isPublic" | "activityVisibility">, viewer: string | null, db: SocialDatabase = prisma): Promise<boolean> {
  if (viewer === profile.userId) return true;
  if (profile.activityVisibility === "private") return false;
  if (profile.activityVisibility === "public" && profile.isPublic) return true;
  if (!viewer) return false;
  const friendship = await db.userFriendship.findUnique({ where: { lowId_highId: socialPair(viewer, profile.userId) } });
  return friendship?.status === "accepted";
}
