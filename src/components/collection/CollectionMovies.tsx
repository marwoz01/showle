"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import { Film, Loader2 } from "@/components/ui/icons";
import MovieGrid from "@/components/collection/MovieGrid";
import ReviewModal from "@/components/collection/ReviewModal";
import EmptyState from "@/components/collection/EmptyState";
import { useCollectionMovies } from "@/hooks/useCollectionMovies";
import type { CollectionCategory, CollectionSort, SavedMovie } from "@/types/collection";

interface Props { category: CollectionCategory; sort: CollectionSort; order: "asc" | "desc"; onSort: (sort: CollectionSort) => void; onAdd: () => void }
export default function CollectionMovies({ category, sort, order, onSort, onAdd }: Props) {
  const { t } = useTranslation();
  const collection = useCollectionMovies(category, sort, order);
  const [reviewMovie, setReviewMovie] = useState<SavedMovie | null>(null);
  const withMovie = (id: string, data?: { rating?: number; category?: CollectionCategory }) => {
    const movie = collection.movies.find((item) => item.id === id);
    return movie ? collection.mutate(movie, data) : Promise.resolve(false);
  };
  return <div className="space-y-4">
    {collection.saveError && !reviewMovie && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-4 text-sm">
      {t.collection.saveError}<button type="button" onClick={() => void collection.retrySave()} className="min-h-11 px-3 text-accent-purple">{t.common.tryAgain}</button>
    </div>}
    {collection.loading ? <div role="status" aria-label={t.common.loading} className="flex min-h-[30vh] items-center justify-center"><Loader2 size={24} className="animate-spin text-muted" /></div>
      : collection.movies.length > 0 ? <>
        <MovieGrid movies={collection.movies} sort={sort} order={order} onSortChange={onSort} pending={collection.pending}
          onRate={(id, rating) => void withMovie(id, { rating })} onChangeCategory={(id, next) => void withMovie(id, { category: next })}
          onDelete={(id) => withMovie(id)} onReview={setReviewMovie} />
        {collection.movies.length < collection.total && !collection.loadError && <div className="flex justify-center">
          <button type="button" onClick={collection.loadMore} disabled={collection.loadingMore} className="min-h-11 rounded-lg border border-white/10 px-6 text-sm text-muted disabled:opacity-50">
            {collection.loadingMore ? t.common.loading : t.collection.loadMore}
          </button>
        </div>}
      </> : !collection.loadError && <EmptyState icon={Film} message={category === "watched" ? t.collection.emptyWatched : t.collection.emptyWatchlist} action={{ label: t.collection.addMovie, onClick: onAdd }} />}
    {collection.loadError && <div role="alert" className="space-y-2 rounded-xl bg-white/5 p-4 text-sm">
      <p>{t.collection.loadError}</p><button type="button" onClick={() => void collection.retryLoad()} className="min-h-11 text-accent-purple">{t.common.tryAgain}</button>
    </div>}
    {reviewMovie && <ReviewModal movieTitle={reviewMovie.title} initialReview={reviewMovie.review} onClose={() => setReviewMovie(null)}
      onSave={(review) => collection.mutate(reviewMovie, { review: review || null })} />}
  </div>;
}
