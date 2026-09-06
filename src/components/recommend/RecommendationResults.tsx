"use client";

import { useTranslation } from "@/i18n";
import RecommendationCard from "@/components/recommend/RecommendationCard";
import RecommendationFeedback from "@/components/recommend/RecommendationFeedback";
import type { Recommendation, RecommendationMeta, RecommendationReaction } from "@/types/recommendation";

interface Props {
  results: Recommendation[]; meta: RecommendationMeta | null; hasDescription: boolean; hasReference?: boolean;
  feedback: Record<number, RecommendationReaction>; pending: number[]; feedbackReady: boolean;
  onReact: (id: number, reaction: RecommendationReaction | null) => void;
}
export default function RecommendationResults({ results, meta, hasDescription, hasReference = false, feedback, pending, feedbackReady, onReact }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      {meta && <div role="status" className="space-y-2 text-sm text-muted">
        {(meta.matching === "filters" || (hasDescription && meta.interpretation === "local") ||
          ((hasDescription || hasReference) && meta.relevance === "local")) && <p>{t.recommendation.degraded}</p>}
        {meta.partial && <p>{t.recommendation.partial(results.length)}</p>}
        {meta.personalized && <p>{t.recommendation.personalized}</p>}
      </div>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {results.map((result, index) => <div key={result.movie.id} className={index === 0 ? "col-span-full" : "flex min-w-0 flex-col"}>
          <div className="flex-1 [&>div]:h-full">
            <RecommendationCard movie={result.movie} justification={result.justification} index={index} variant={index === 0 ? "top" : "regular"} />
          </div>
          <RecommendationFeedback selected={feedback[result.movie.id]} disabled={!feedbackReady || pending.includes(result.movie.id)} onReact={(reaction) => onReact(result.movie.id, reaction)} />
        </div>)}
      </div>
    </div>
  );
}
