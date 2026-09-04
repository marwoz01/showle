"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { MediaDetails } from "@/types";
import { useTranslation } from "@/i18n";
import { Film, Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  onSelect: (movie: MediaDetails) => void;
  disabled?: boolean;
}

export default function SearchBar({ onSelect, disabled }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaDetails[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data: MediaDetails[] = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setIsOpen(false);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(movie: MediaDetails) {
    onSelect(movie);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {isLoading ? (
          <Loader2
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        ) : (
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={t.game.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full rounded-xl border border-white/6 bg-card py-3.5 pl-12 pr-4 text-base sm:text-sm text-foreground placeholder-muted outline-none transition-all focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 disabled:opacity-50"
        />
      </div>

      {isOpen && (
        <div className="animate-search-popover absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/6 bg-card-hover py-1 shadow-xl shadow-black/40">
          {results.map((movie, i) => (
            <button
              key={movie.id}
              onClick={() => handleSelect(movie)}
              style={{ "--result-delay": `${i * 45}ms` } as CSSProperties}
              className={`animate-search-result flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-accent-purple/15 text-foreground"
                  : "text-muted hover:bg-white/4 hover:text-foreground"
              }`}
            >
              <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-white/5">
                {movie.posterPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted/50">
                    <Film size={14} />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {movie.title}
                </span>
                <span className="block text-xs text-muted">{movie.year}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
