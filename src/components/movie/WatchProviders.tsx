"use client";
import { normalizeDisplayText } from "@/lib/typography";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { getWatchProviderUrl } from "@/lib/watch-provider-links";
import type { WatchProvider, WatchProvidersResult } from "@/lib/tmdb";

const providerLinkClassName = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/5 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-accent-purple";

export default function WatchProviders({
  tmdbId,
  divider = true,
}: {
  tmdbId: number;
  divider?: boolean;
}) {
  const { t } = useTranslation();
  const [response, setResponse] = useState<{ id: number; data: WatchProvidersResult | null } | null>(null);
  const data = response?.id === tmdbId ? response.data : null;
  const allProvidersUrl = data?.link ?? `https://www.themoviedb.org/movie/${tmdbId}/watch?locale=PL`;

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/movies/watch-providers?id=${tmdbId}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: WatchProvidersResult | null) => {
        if (!ac.signal.aborted) setResponse({ id: tmdbId, data: d });
      })
      .catch(() => {
        if (!ac.signal.aborted) setResponse({ id: tmdbId, data: null });
      });
    return () => ac.abort();
  }, [tmdbId]);

  return (
    <div className={divider ? "border-t border-white/6 pt-4" : "min-w-0"}>
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {t.result.whereToWatch}
      </h4>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          {data?.flatrate?.map((p: WatchProvider) => (
            <ProviderLogo key={p.provider_id} provider={p} size={36}
              href={getWatchProviderUrl(p.provider_name, allProvidersUrl)}
              label={t.result.openProvider(normalizeDisplayText(p.provider_name))} />
          ))}
          <a
            href="https://web.stremio.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.result.openStremio}
            title={t.result.openStremio}
            className={providerLinkClassName}
          >
            <Image src="/providers/stremio.png" alt="Stremio" width={36} height={36} className="rounded-md" />
          </a>
        </div>

        {data?.rent && data.rent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{t.result.rent}:</span>
            {data.rent.map((p: WatchProvider) => (
              <ProviderLogo key={p.provider_id} provider={p} size={28}
                href={getWatchProviderUrl(p.provider_name, allProvidersUrl)}
                label={t.result.openProvider(normalizeDisplayText(p.provider_name))} />
            ))}
          </div>
        )}

        {data?.link && (
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted/60 transition-colors hover:text-muted"
          >
            {t.result.seeAllProviders} · JustWatch
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

function ProviderLogo({ provider, size, href, label }: {
  provider: WatchProvider;
  size: number;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={providerLinkClassName}
      title={label}
    >
      <span className="relative block overflow-hidden rounded-md" style={{ width: size, height: size }}>
        <Image
          src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
          alt={normalizeDisplayText(provider.provider_name)}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </span>
    </a>
  );
}
