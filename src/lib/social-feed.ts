import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canReadSocialProfile, socialCard, socialCardSelect, validSocialSlug } from "@/lib/social";
import { ProfileError } from "@/lib/user-profile-input";
import type { SocialActivity } from "@/types/social";

export function socialActivityWhere(viewer: string | null, slug?: string): Prisma.UserProfileWhereInput {
  if (!viewer) return { publicSlug: slug, isPublic: true, activityVisibility: "public" };
  const friendship = { OR: [
    { friendshipsLow: { some: { highId: viewer, status: "accepted" } } },
    { friendshipsHigh: { some: { lowId: viewer, status: "accepted" } } },
  ] };
  const audience = { OR: [
    { isPublic: true, activityVisibility: "public" },
    { activityVisibility: { in: ["friends", "public"] }, ...friendship },
  ] };
  if (slug) return { publicSlug: slug, OR: [{ userId: viewer }, audience] };
  return { userId: { not: viewer }, AND: [audience, { OR: [friendship, { followers: { some: { followerId: viewer } } }] }] };
}

export async function getSocialFeed(viewer: string | null, slug?: string): Promise<{ activity: SocialActivity[] }> {
  if (!viewer && !slug) throw new ProfileError("unauthorized", 401);
  if (slug !== undefined) {
    if (!validSocialSlug(slug)) throw new ProfileError("not_found", 404);
    const profile = await prisma.userProfile.findUnique({ where: { publicSlug: slug }, select: { userId: true, isPublic: true } });
    if (!profile || !await canReadSocialProfile(profile, viewer)) throw new ProfileError("not_found", 404);
  }
  const where = socialActivityWhere(viewer, slug);
  const profiles = await prisma.userProfile.findMany({ where, select: socialCardSelect });
  if (!profiles.length) return { activity: [] };
  const movies = await prisma.savedMovie.findMany({
    where: { userId: { in: profiles.map((profile) => profile.userId) }, category: "watched" },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 30,
    select: { id: true, userId: true, tmdbId: true, title: true, year: true, posterPath: true, rating: true, updatedAt: true },
  });
  // Discard results after an unfollow, friendship removal, privacy change or profile reset.
  const current = await prisma.userProfile.findMany({ where: { AND: [where, { userId: { in: profiles.map((profile) => profile.userId) } }] }, select: socialCardSelect });
  const people = new Map(current.map((profile) => [profile.userId, socialCard(profile, true)]));
  return { activity: movies.flatMap((movie): SocialActivity[] => {
    const person = people.get(movie.userId);
    if (!person) return [];
    return [{ id: movie.id, person, movie: { id: movie.tmdbId, title: movie.title, year: movie.year, posterPath: movie.posterPath }, rating: movie.rating, date: movie.updatedAt.toISOString(), kind: movie.rating === null ? "watched" : "rating" }];
  }) };
}
