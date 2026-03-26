"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { Loader2, Film, User } from "lucide-react";
import Link from "next/link";
import HistoryTable, { type HistoryItem } from "@/components/history/HistoryTable";
import HistoryFilters from "@/components/history/HistoryFilters";
import HistoryPagination from "@/components/history/HistoryPagination";
import GameReviewModal from "@/components/history/GameReviewModal";

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}

type StatusFilter = "all" | "won" | "lost";

const PER_PAGE = 20;

function HistoryContent() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const initialStatus = (searchParams.get("status") || "all") as StatusFilter;

  const [page, setPage] = useState(initialPage);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    ["all", "won", "lost"].includes(initialStatus) ? initialStatus : "all"
  );
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewGameId, setReviewGameId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const fetchHistory = useCallback(async (p: number, status: StatusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        perPage: String(PER_PAGE),
      });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/game/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchHistory(page, statusFilter);
  }, [isSignedIn, page, statusFilter, fetchHistory]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (statusFilter !== "all") params.set("status", statusFilter);
    const qs = params.toString();
    router.replace(`/history${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [page, statusFilter, router]);

  function handleFilterChange(newFilter: StatusFilter) {
    setStatusFilter(newFilter);
    setPage(1);
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/6 bg-card py-20">
        <User size={32} className="text-muted" />
        <p className="text-sm text-muted">{t.history.noGames}</p>
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
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t.history.title}
          </h1>
          {!loading && (
            <span className="text-sm text-muted">
              ({total} {t.history.totalGames})
            </span>
          )}
        </div>
        <HistoryFilters value={statusFilter} onChange={handleFilterChange} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/6 bg-card py-20">
          <Film size={32} className="text-muted" />
          <p className="text-sm text-muted">{t.history.noGames}</p>
        </div>
      ) : (
        <>
          <HistoryTable items={items} onReview={setReviewGameId} />
          <HistoryPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Review modal */}
      {reviewGameId && (
        <GameReviewModal
          gameId={reviewGameId}
          onClose={() => setReviewGameId(null)}
        />
      )}
    </>
  );
}
