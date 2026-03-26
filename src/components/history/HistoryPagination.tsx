"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n";

interface HistoryPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function HistoryPagination({
  page,
  totalPages,
  onPageChange,
}: HistoryPaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-white/6 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft size={14} />
        {t.history.previousPage}
      </button>
      <span className="text-xs text-muted">
        {page} {t.history.pageOf} {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-white/6 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        {t.history.nextPage}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
