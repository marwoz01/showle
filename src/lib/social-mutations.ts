import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/request-body";
import { getOrCreateUserProfile } from "@/lib/user-profile";
import { ProfileError } from "@/lib/user-profile-input";
import { getSocialPerson, socialPair, validSocialSlug } from "@/lib/social";
import type { SocialAction } from "@/types/social";

const actions: SocialAction[] = ["follow", "unfollow", "request", "accept", "decline", "cancel", "remove"];

export function parseSocialAction(input: unknown): { slug: string; action: SocialAction } {
  if (!isRecord(input) || !validSocialSlug(input.slug) || !actions.includes(input.action as SocialAction)) throw new ProfileError("invalid_relationship");
  return { slug: input.slug, action: input.action as SocialAction };
}

export async function updateSocialRelationship(viewer: string, slug: string, action: SocialAction) {
  await getOrCreateUserProfile(viewer);
  const target = await prisma.userProfile.findUnique({ where: { publicSlug: slug }, select: { userId: true } });
  if (!target) throw new ProfileError("not_found", 404);
  if (target.userId === viewer) throw new ProfileError("own_profile", 409);
  const pair = socialPair(viewer, target.userId);
  return prisma.$transaction(async (tx) => {
    // Match the profile reset lock, in a stable order, so deletion cannot recreate a dangling edge.
    for (const userId of [pair.lowId, pair.highId]) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"profile:" + userId}))`;
    const [currentTarget, currentViewer] = await Promise.all([
      tx.userProfile.findUnique({ where: { publicSlug: slug } }),
      tx.userProfile.findUnique({ where: { userId: viewer } }),
    ]);
    if (!currentTarget || currentTarget.userId !== target.userId || !currentViewer) throw new ProfileError("not_found", 404);
    const followKey = { followerId: viewer, followingId: target.userId };
    const friendship = await tx.userFriendship.findUnique({ where: { lowId_highId: pair } });
    if (action === "follow") {
      if (!currentTarget.isPublic) throw new ProfileError("private_profile", 403);
      await tx.userFollow.upsert({ where: { followerId_followingId: followKey }, update: {}, create: followKey });
    } else if (action === "unfollow") {
      await tx.userFollow.deleteMany({ where: followKey });
    } else if (action === "request") {
      if (friendship && friendship.requesterId !== viewer && friendship.status === "pending") throw new ProfileError("incoming_request", 409);
      if (!friendship) await tx.userFriendship.create({ data: { ...pair, requesterId: viewer } });
    } else if (action === "accept") {
      if (!friendship || friendship.requesterId === viewer || friendship.status !== "pending") throw new ProfileError("no_incoming_request", 409);
      await tx.userFriendship.update({ where: { lowId_highId: pair }, data: { status: "accepted" } });
    } else {
      if (!friendship) throw new ProfileError("no_relationship", 409);
      const allowed = action === "remove" ? friendship.status === "accepted"
        : friendship.status === "pending" && (action === "cancel" ? friendship.requesterId === viewer : friendship.requesterId !== viewer);
      if (!allowed) throw new ProfileError("invalid_relationship_action", 409);
      await tx.userFriendship.delete({ where: { lowId_highId: pair } });
    }
    return { person: await getSocialPerson(viewer, slug, tx) };
  }, { timeout: 15_000 });
}
