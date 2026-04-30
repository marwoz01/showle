"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n";

interface MovieGalleryProps {
  paths: string[];
  label: string;
}

export default function MovieGallery({ paths, label }: MovieGalleryProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = activeIndex !== null;

  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(
    () =>
      setActiveIndex((i) => (i === null ? null : (i + 1) % paths.length)),
    [paths.length],
  );
  const prev = useCallback(
    () =>
      setActiveIndex((i) =>
        i === null ? null : (i - 1 + paths.length) % paths.length,
      ),
    [paths.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      } else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, next, prev]);

  if (paths.length === 0) return null;

  // Render the lightbox via portal so it escapes any scrolling ancestor
  // (e.g. the MovieDetailsModal's overflow-y-auto container, whose scrollbar
  // would otherwise leak through on top of the dimmed background).
  const lightbox =
    isOpen && activeIndex !== null && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
            onClick={close}
          >
            <div
              className="relative flex h-full w-full max-w-7xl items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-[80vh] w-full">
                <Image
                  key={paths[activeIndex]}
                  src={`https://image.tmdb.org/t/p/original${paths[activeIndex]}`}
                  alt=""
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              aria-label={t.movieModal.close}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <X size={20} />
            </button>

            {paths.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label={t.movieModal.previous}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:left-6"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  aria-label={t.movieModal.next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:right-6"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md">
              {activeIndex + 1} / {paths.length}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </h4>
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible">
        {paths.map((path, i) => (
          <button
            key={path}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(i);
            }}
            className="relative aspect-video w-64 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-white/5 transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:outline-none sm:w-auto"
          >
            <Image
              src={`https://image.tmdb.org/t/p/w500${path}`}
              alt=""
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
      {lightbox}
    </>
  );
}
