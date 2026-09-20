"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import AdvancedRecommendations from "@/components/recommend/AdvancedRecommendations";
import RecommendationHome from "@/components/recommend/RecommendationHome";
import RecommendationLoading from "@/components/recommend/RecommendationLoading";

export default function RecommendPage() {
  return <Suspense fallback={<RecommendationLoading />}><RecommendationRoute /></Suspense>;
}

function RecommendationRoute() {
  const params = useSearchParams();
  const { userId, isLoaded } = useAuth();
  const { locale } = useTranslation();
  if (!isLoaded) return <RecommendationLoading />;
  const key = `${userId ?? "guest"}:${locale}`;
  return params.get("source") === "watchlist" || params.get("advanced") === "1"
    ? <AdvancedRecommendations key={`${key}:${params.get("source")}`} />
    : <RecommendationHome key={key} userId={userId ?? null} />;
}
