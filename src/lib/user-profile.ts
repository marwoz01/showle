import { randomBytes } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import type { UserProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTodayKey, normalizeStoredDate, previousDateKey } from "@/lib/game-date";
import type { ProfileBadge, ProfileDetails, ProfileMovie, ProfilePreferences, ProfileSummary } from "@/types/profile";

export async function getOrCreateUserProfile(userId: string, refreshIdentity = false): Promise<UserProfile> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (existing && !refreshIdentity) return existing;
  const user = await currentUser();
  const identity = user?.id === userId ? user : null;
  const avatarUrl = identity?.imageUrl?.startsWith("https://") ? identity.imageUrl : null;
  if (existing) {
    if (!identity || existing.avatarUrl === avatarUrl) return existing;
    return prisma.userProfile.update({ where: { userId }, data: { avatarUrl } });
  }
  const locale = (await cookies()).get("showle-locale")?.value === "en" ? "en" : "pl";
  const fallbackName = locale === "en" ? "Movie lover" : "Kinoman";
  const displayName = (identity?.username || identity?.firstName || fallbackName).trim().slice(0, 40) || fallbackName;
  return prisma.userProfile.upsert({
    where: { userId }, update: {},
    create: { userId, publicSlug: randomBytes(12).toString("hex"), displayName, avatarUrl, locale },
  });
}

export function profilePreferences(profile: Pick<UserProfile, "genres" | "excludedGenres" | "providerIds" | "maxRuntime">): ProfilePreferences {
  return { genres: profile.genres, excludedGenres: profile.excludedGenres, providerIds: profile.providerIds, maxRuntime: profile.maxRuntime };
}

export function privateProfileView(profile: UserProfile): ProfileDetails {
  return {
    displayName: profile.displayName, bio: profile.bio, isPublic: profile.isPublic,
    publicSlug: profile.publicSlug, avatarUrl: profile.avatarUrl,
    favoriteMovies: profile.favoriteMovies as unknown as ProfileMovie[],
    preferences: profilePreferences(profile), locale: profile.locale === "en" ? "en" : "pl",
  };
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary> {
  const [movies, watchlistCount, stats, record] = await Promise.all([
    prisma.savedMovie.findMany({ where: { userId, category: "watched" }, select: { genres: true, runtime: true, rating: true } }),
    prisma.savedMovie.count({ where: { userId, category: "watchlist" } }),
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.higherLowerRecord.findUnique({ where: { userId } }),
  ]);
  const genres = new Map<string, number>();
  let totalMinutes = 0;
  const ratings: number[] = [];
  for (const movie of movies) {
    totalMinutes += Math.max(0, movie.runtime);
    if (movie.rating !== null) ratings.push(movie.rating);
    for (const genre of new Set(movie.genres)) genres.set(genre, (genres.get(genre) ?? 0) + 1);
  }
  const lastPlayed = normalizeStoredDate(stats?.lastPlayedDate);
  const today = getTodayKey();
  const streakActive = lastPlayed === today || lastPlayed === previousDateKey(today);
  return {
    watchedCount: movies.length, watchlistCount, totalMinutes,
    averageRating: ratings.length ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length * 10) / 10 : null,
    favoriteGenres: [...genres].map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre)).slice(0, 5),
    daily: { gamesPlayed: stats?.gamesPlayed ?? 0, gamesWon: stats?.gamesWon ?? 0, currentStreak: streakActive ? stats?.currentStreak ?? 0 : 0, maxStreak: stats?.maxStreak ?? 0, averageGuesses: Math.round((stats?.averageGuesses ?? 0) * 10) / 10 },
    higherLowerBest: record?.bestScore ?? 0,
  };
}

export function getProfileBadges(summary: ProfileSummary): ProfileBadge[] {
  const definitions: [ProfileBadge["id"], number, number][] = [
    ["first-film", summary.watchedCount, 1], ["film-collector", summary.watchedCount, 50],
    ["daily-first-win", summary.daily.gamesWon, 1], ["daily-streak-7", summary.daily.maxStreak, 7],
    ["year-expert", summary.higherLowerBest, 10],
  ];
  return definitions.map(([id, progress, target]) => ({ id, unlocked: progress >= target, progress: Math.min(progress, target), target }));
}
