"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useTranslation } from "@/i18n";
import { MAX_ATTEMPTS } from "@/constants";

export interface HistoryItem {
  id: string;
  dateKey: string;
  mode: string;
  status: string;
  attemptCount: number;
  hintsUsed: number;
  targetMovieId: number;
  targetTitle: string;
  targetYear: number;
  targetPoster: string;
  completedAt: string;
}

interface HistoryTableProps {
  items: HistoryItem[];
  onReview: (id: string) => void;
}

function formatDate(dateKey: string, locale: string): string {
  const date = new Date(dateKey + "T00:00:00");
  return date.toLocaleDateString(locale === "pl" ? "pl-PL" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryTable({ items, onReview }: HistoryTableProps) {
  const { t, locale } = useTranslation();

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-white/6 bg-card lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/6 bg-white/3">
              <th className="w-full px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                {t.history.columnMovie}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                {t.history.columnResult}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                {t.history.columnAttempts}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                {t.history.columnHints}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                {t.history.columnDate}
              </th>
              <th className="whitespace-nowrap px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const won = item.status === "won";
              return (
                <tr
                  key={item.id}
                  className="border-t border-white/6 transition-colors hover:bg-white/4"
                >
                  {/* Movie */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {item.targetPoster ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${item.targetPoster}`}
                          alt={item.targetTitle}
                          width={32}
                          height={48}
                          className="h-12 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-8 items-center justify-center rounded bg-white/5">
                          <Film size={14} className="text-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.targetTitle || "—"}
                        </p>
                        {item.targetYear > 0 && (
                          <p className="text-xs text-muted">{item.targetYear}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Result */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        won
                          ? "bg-match-exact/15 text-match-exact"
                          : "bg-match-miss/15 text-match-miss"
                      }`}
                    >
                      {won ? t.history.resultWon : t.history.resultLost}
                    </span>
                  </td>
                  {/* Attempts */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-foreground">
                      {item.attemptCount}/{MAX_ATTEMPTS}
                    </span>
                  </td>
                  {/* Hints */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-muted">{item.hintsUsed}</span>
                  </td>
                  {/* Date */}
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span className="text-sm text-muted">
                      {formatDate(item.dateKey, locale)}
                    </span>
                  </td>
                  {/* Review */}
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <button
                      onClick={() => onReview(item.id)}
                      className="text-sm font-medium text-accent-purple transition-opacity hover:opacity-80"
                    >
                      {t.history.review}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {items.map((item) => {
          const won = item.status === "won";
          return (
            <div
              key={item.id}
              className="rounded-xl border border-white/6 bg-card p-4"
            >
              <div className="flex items-start gap-3">
                {item.targetPoster ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${item.targetPoster}`}
                    alt={item.targetTitle}
                    width={40}
                    height={60}
                    className="h-15 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-15 w-10 shrink-0 items-center justify-center rounded bg-white/5">
                    <Film size={16} className="text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.targetTitle || "—"}
                      </p>
                      {item.targetYear > 0 && (
                        <p className="text-xs text-muted">{item.targetYear}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        won
                          ? "bg-match-exact/15 text-match-exact"
                          : "bg-match-miss/15 text-match-miss"
                      }`}
                    >
                      {won ? t.history.resultWon : t.history.resultLost}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted">
                      {item.attemptCount}/{MAX_ATTEMPTS} {t.history.attempts.toLowerCase()}
                      {" · "}
                      {item.hintsUsed} {t.history.hintsUsed.toLowerCase()}
                      {" · "}
                      {formatDate(item.dateKey, locale)}
                    </p>
                    <button
                      onClick={() => onReview(item.id)}
                      className="text-xs font-medium text-accent-purple transition-opacity hover:opacity-80"
                    >
                      {t.history.review}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
