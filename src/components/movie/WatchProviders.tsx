"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { WatchProvider, WatchProvidersResult } from "@/lib/tmdb";

export default function WatchProviders({ tmdbId }: { tmdbId: number }) {
  const { t } = useTranslation();
  const [data, setData] = useState<WatchProvidersResult | null | undefined>(undefined);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/movies/watch-providers?id=${tmdbId}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: WatchProvidersResult | null) => setData(d))
      .catch(() => setData(null));
    return () => ac.abort();
  }, [tmdbId]);

  // undefined = loading, null = no data
  if (!data || (!data.flatrate?.length && !data.rent?.length)) return null;

  return (
    <div className="border-t border-white/6 pt-4">
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {t.result.whereToWatch}
      </h4>

      <div className="flex flex-col gap-2.5">
        {data.flatrate && data.flatrate.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.flatrate.map((p: WatchProvider) => (
              <ProviderLogo key={p.provider_id} provider={p} size={36} />
            ))}
          </div>
        )}

        {data.rent && data.rent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{t.result.rent}:</span>
            {data.rent.map((p: WatchProvider) => (
              <ProviderLogo key={p.provider_id} provider={p} size={28} />
            ))}
          </div>
        )}

        {data.link && (
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted/60 transition-colors hover:text-muted"
          >
            {t.result.seeAllProviders}
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

function ProviderLogo({ provider, size }: { provider: WatchProvider; size: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-white/5"
      style={{ width: size, height: size }}
      title={provider.provider_name}
    >
      <Image
        src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
        alt={provider.provider_name}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
    </div>
  );
}
