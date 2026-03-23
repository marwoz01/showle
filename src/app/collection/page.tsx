"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { Plus, Loader2, Film, User } from "lucide-react";
import CollectionTabs, {
  type CollectionTab,
} from "@/components/collection/CollectionTabs";
import MovieGrid from "@/components/collection/MovieGrid";
import ReviewModal from "@/components/collection/ReviewModal";
import RankingsList from "@/components/collection/RankingsList";
import EmptyState from "@/components/collection/EmptyState";
import Link from "next/link";

interface SavedMovie {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  category: string;
  rating: number | null;
  review: string | null;
  genres: string[];
  director: string;
  overview: string;
}

type SortOption = "date" | "rating" | "title" | "year";

export default function CollectionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      }
    >
      <CollectionContent />
    </Suspense>
  );
}

function CollectionContent() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as CollectionTab | null;
  const [activeTab, setActiveTab] = useState<CollectionTab>(
    tabParam && ["watched", "watchlist", "rankings"].includes(tabParam)
      ? tabParam
      : "watched"
  );
  const [sort, setSort] = useState<SortOption>("date");
  const [movies, setMovies] = useState<SavedMovie[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ watched: 0, watchlist: 0, rankings: 0 });
  const [reviewMovie, setReviewMovie] = useState<SavedMovie | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleTabChange = (tab: CollectionTab) => {
    setActiveTab(tab);
    setSort("date");
    router.replace(`/collection?tab=${tab}`, { scroll: false });
  };

  const fetchMovies = useCallback(async () => {
    if (activeTab === "rankings") return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/collection?category=${activeTab}&sort=${sort}`
      );
      const data = await res.json();
      setMovies(data.items || []);
      setTotal(data.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [activeTab, sort]);

  const fetchCounts = useCallback(async () => {
    try {
      const [watched, watchlist, rankings] = await Promise.all([
        fetch("/api/collection?category=watched").then((r) => r.json()),
        fetch("/api/collection?category=watchlist").then((r) => r.json()),
        fetch("/api/collection/rankings").then((r) => r.json()),
      ]);
      setCounts({
        watched: watched.total || 0,
        watchlist: watchlist.total || 0,
        rankings: Array.isArray(rankings) ? rankings.length : 0,
      });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchMovies();
  }, [isSignedIn, fetchMovies]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchCounts();
  }, [isSignedIn, fetchCounts]);

  const handleRate = async (id: string, rating: number) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === id ? { ...m, rating } : m))
    );
    await fetch(`/api/collection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  };

  const handleChangeCategory = async (
    id: string,
    category: "watched" | "watchlist"
  ) => {
    setMovies((prev) => prev.filter((m) => m.id !== id));
    setTotal((prev) => prev - 1);
    await fetch(`/api/collection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    fetchCounts();
  };

  const handleDelete = async (id: string) => {
    setMovies((prev) => prev.filter((m) => m.id !== id));
    setTotal((prev) => prev - 1);
    await fetch(`/api/collection/${id}`, { method: "DELETE" });
    fetchCounts();
  };

  const handleSaveReview = async (review: string) => {
    if (!reviewMovie) return;
    setMovies((prev) =>
      prev.map((m) =>
        m.id === reviewMovie.id ? { ...m, review: review || null } : m
      )
    );
    await fetch(`/api/collection/${reviewMovie.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review: review || null }),
    });
    setReviewMovie(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-muted">
          <User size={24} />
        </div>
        <p className="text-sm text-muted">{t.nav.login}</p>
        <Link
          href="/sign-in"
          className="rounded-lg bg-accent-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t.auth.signIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t.collection.title}
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          {t.collection.addMovie}
        </button>
      </div>

      {/* Tabs */}
      <CollectionTabs
        active={activeTab}
        onChange={handleTabChange}
        counts={counts}
      />

      {/* Content */}
      {activeTab !== "rankings" ? (
        loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            icon={Film}
            message={
              activeTab === "watched"
                ? t.collection.emptyWatched
                : t.collection.emptyWatchlist
            }
            action={{
              label: t.collection.addMovie,
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <MovieGrid
            movies={movies}
            sort={sort}
            onSortChange={setSort}
            onRate={handleRate}
            onChangeCategory={handleChangeCategory}
            onDelete={handleDelete}
            onReview={setReviewMovie}
          />
        )
      ) : (
        <RankingsList />
      )}

      {/* Review Modal */}
      {reviewMovie && (
        <ReviewModal
          movieTitle={reviewMovie.title}
          initialReview={reviewMovie.review}
          onSave={handleSaveReview}
          onClose={() => setReviewMovie(null)}
        />
      )}

      {/* Add Movie Modal */}
      {showAddModal && (
        <AddMovieModalLazy
          onClose={() => {
            setShowAddModal(false);
            fetchMovies();
            fetchCounts();
          }}
        />
      )}
    </div>
  );
}

// Lazy-loaded AddMovieModal to avoid circular deps
function AddMovieModalLazy({ onClose }: { onClose: () => void }) {
  const [Component, setComponent] = useState<React.FC<{
    onClose: () => void;
  }> | null>(null);

  useEffect(() => {
    import("@/components/collection/AddMovieModal").then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) return null;
  return <Component onClose={onClose} />;
}
