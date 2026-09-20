"use client";
import { useTranslation } from "@/i18n";
import { Play, ExternalLink } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import type { MovieTrailer } from "@/lib/trailers";
export interface ResultStat { label: string; icon: React.ReactNode; value: string }
interface Props { title: string; won: boolean; youtubeEmbedUrl: string | null; trailerPending: boolean; activeTrailer: MovieTrailer | null; stats: ResultStat[] }
export default function ResultTrailer({ title, won, youtubeEmbedUrl, trailerPending, activeTrailer, stats }: Props) {
  const { t } = useTranslation();
  return (<>
        {/* Trailer follows the poster and cast on narrow screens. */}
        <aside
          data-result-reveal="trailer"
          className={`min-w-0 lg:col-start-2 ${
            won
              ? "lg:row-start-2 xl:row-start-1 xl:col-start-3"
              : "order-none lg:row-start-2 xl:col-start-3 xl:row-start-1"
          }`}
        >
          {won && (youtubeEmbedUrl || trailerPending) ? (
            <div className="soft-card overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/15 text-accent-purple">
                    <Play size={14} className="fill-current" />
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {t.result.trailer}
                  </span>
                </div>
                {activeTrailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(activeTrailer.key)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
                  >
                    {t.result.watchOnYouTube}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="aspect-video w-full overflow-hidden bg-black">
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`${t.result.trailer}: ${normalizeDisplayText(title)}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="h-9 w-9 animate-pulse rounded-full bg-accent-purple/20" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-px bg-white/5">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-w-0 flex-col items-center bg-[#111114] px-2 py-4 text-center"
                  >
                    <span className="mb-1.5 text-muted">{stat.icon}</span>
                    <span className="text-xl font-bold text-foreground">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 truncate text-[10px] text-muted sm:text-xs">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 xl:grid-cols-1 xl:gap-4 xl:border-l xl:border-white/6 xl:pl-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 rounded-xl bg-white/3 px-3 py-4 xl:items-start xl:bg-transparent xl:px-0 xl:py-0"
                >
                  <span className="text-muted">{stat.icon}</span>
                  <span className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-xs text-muted">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

</>);
}
