"use client";
import { useEffect, useState } from "react";
import type { MediaDetails } from "@/types";
import type { MovieTrailer } from "@/lib/trailers";
interface TrailerState {
  requestKey: string;
  trailer: MovieTrailer | null;
  autoplay: boolean;
}

export function useResultMedia(answer: MediaDetails, won: boolean, celebrate: boolean, locale: string) {
  const [gallery, setGallery] = useState<string[]>([]);
  const [trailerState, setTrailerState] = useState<TrailerState | null>(null);
  const trailerRequestKey = `${answer.id}:${locale}`;

  // Fetch a handful of cinematic stills once the result is shown.
  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/movies/gallery?id=${answer.id}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.backdrops) setGallery(data.backdrops as string[]);
      })
      .catch(() => {
        // ignore — gallery is purely cosmetic
      });
    return () => ac.abort();
  }, [answer.id]);

  useEffect(() => {
    if (!won) return;

    const ac = new AbortController();
    fetch(`/api/movies/trailer?id=${answer.id}&lang=${locale}`, {
      signal: ac.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const trailer = (data?.trailer ?? null) as MovieTrailer | null;
        setTrailerState({
          requestKey: trailerRequestKey,
          trailer,
          autoplay:
            celebrate &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
      })
      .catch(() => {
        // A missing trailer should never block the result screen.
      });

    return () => ac.abort();
  }, [answer.id, locale, trailerRequestKey, won, celebrate]);

  const activeTrailer =
    won && trailerState?.requestKey === trailerRequestKey
      ? trailerState.trailer
      : null;
  const trailerAutoplay =
    trailerState?.requestKey === trailerRequestKey && trailerState.autoplay;
  const youtubeEmbedUrl = activeTrailer
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeTrailer.key)}?autoplay=${trailerAutoplay ? "1" : "0"}&mute=${trailerAutoplay ? "1" : "0"}&playsinline=1&rel=0&hl=${locale}&cc_lang_pref=${locale}`
    : null;
  const trailerPending = won && trailerState?.requestKey !== trailerRequestKey;

  return { gallery, activeTrailer, youtubeEmbedUrl, trailerPending };
}
