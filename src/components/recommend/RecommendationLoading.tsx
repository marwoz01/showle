"use client";

import { useTranslation } from "@/i18n";
import { Loader2 } from "@/components/ui/icons";

export default function RecommendationLoading() {
  const { t } = useTranslation();
  return <div className="mx-auto max-w-6xl space-y-3" aria-busy="true">
    <h1 className="text-3xl font-semibold sm:text-4xl">{t.recommendationHome.title}</h1>
    <p className="text-sm text-muted sm:text-base">{t.recommendationHome.subtitle}</p>
    <p role="status" className="flex items-center justify-center gap-3 py-12 text-muted"><Loader2 size={22} className="animate-spin" />{t.common.loading}</p>
  </div>;
}
