import { prisma } from "@/lib/prisma";
import type { RecommendationSettings } from "@/types/recommendation-settings";

const fields = { favoriteIds: true, providerIds: true, onboarded: true } as const;

export async function getRecommendationSettings(userId: string): Promise<RecommendationSettings | null> {
  return prisma.recommendationSettings.findUnique({ where: { userId }, select: fields });
}

export async function saveRecommendationSettings(userId: string, settings: RecommendationSettings) {
  return prisma.recommendationSettings.upsert({
    where: { userId }, create: { userId, ...settings }, update: settings, select: fields,
  });
}
