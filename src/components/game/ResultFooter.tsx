"use client";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import type { GuessResult } from "@/types";
export default function ResultFooter({ shareFallback, guesses }: { shareFallback: string; guesses: GuessResult[] }) {
  const { t, locale } = useTranslation();
  return (<>
      {shareFallback && (
        <div className="px-6 pb-5">
          <p role="alert" className="mb-2 text-sm text-muted">
            {experience[locale].shareError}
          </p>
          <textarea
            readOnly
            value={shareFallback}
            aria-label={t.result.share}
            onFocus={(event) => event.target.select()}
            className="h-40 w-full rounded-xl bg-black/20 p-3 text-sm"
          />
        </div>
      )}
      {/* Footer — emoji grid */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/6 px-6 py-5">
        <div>
          <h3 className="font-semibold">{experience[locale].practiceTitle}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {experience[locale].practiceDesc}
          </p>
        </div>
        <Link
          href="/play/practice"
          className="shrink-0 rounded-xl bg-accent-purple/15 px-5 py-3 text-sm font-semibold text-accent-purple hover:bg-accent-purple/25"
        >
          {experience[locale].practiceAction}
        </Link>
      </div>
      <div className="border-t border-white/6 bg-white/2 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {[...guesses]
            .sort((a, b) => a.attemptNumber - b.attemptNumber)
            .map((g, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted">
                  #{i + 1}
                </span>
                <div className="flex gap-0.5">
                  {g.comparison.map((c, j) => (
                    <div
                      key={j}
                      className={`h-3 w-3 rounded-sm ${
                        c.status === "exact"
                          ? "bg-match-exact"
                          : c.status === "partial"
                            ? "bg-match-partial"
                            : "bg-match-miss"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
</>);
}
