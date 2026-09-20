"use client";
import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import { localizeCountry, localizeGenre } from "@/lib/localization";
import CastList from "@/components/movie/CastList";
import type { MediaDetails } from "@/types";
export default function ResultDetails({ answer: displayAnswer, localizedTagline }: { answer: MediaDetails; localizedTagline?: string }) {
  const { t, locale } = useTranslation();
  return (<>
        {/* Middle — details */}
        <div
          data-result-reveal="details"
          className={`flex min-w-0 flex-col gap-4 lg:col-start-2 ${"lg:row-start-1"}`}
        >
          {localizedTagline && (
            <p className="text-base italic text-muted/80">
              &ldquo;{normalizeDisplayText(localizedTagline)}&rdquo;
            </p>
          )}

          {displayAnswer.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayAnswer.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs font-medium text-muted"
                >
                  {localizeGenre(genre, t)}
                </span>
              ))}
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {displayAnswer.director && displayAnswer.director !== "Unknown" && (
              <>
                <dt className="text-muted">{t.comparison.director}</dt>
                <dd className="text-foreground">{normalizeDisplayText(displayAnswer.director)}</dd>
              </>
            )}
            {displayAnswer.country && displayAnswer.country !== "Unknown" && (
              <>
                <dt className="text-muted">{t.comparison.country}</dt>
                <dd className="text-foreground">
                  {localizeCountry(
                    displayAnswer.country,
                    displayAnswer.countryCode,
                    locale,
                    t.common.unknown,
                  )}
                </dd>
              </>
            )}
          </dl>

          {displayAnswer.cast && displayAnswer.cast.length > 0 && (
            <div className="border-t border-white/6 pt-4">
              <CastList cast={displayAnswer.cast} label={t.result.cast} />
            </div>
          )}
        </div>

</>);
}
