"use client";

import { useState, useRef, useEffect } from "react";
import { MediaDetails } from "@/types";
import { searchMockMovies } from "@/lib/mock-data";
import { useTranslation } from "@/i18n";

interface SearchBarProps {
  onSelect: (movie: MediaDetails) => void;
  disabled?: boolean;
}

export default function SearchBar({ onSelect, disabled }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaDetails[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      const found = searchMockMovies(query);
      setResults(found);
      setIsOpen(found.length > 0);
      setSelectedIndex(-1);
    }, 200);

    return () => clearTimeout(timer);
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
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder={t.game.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full rounded-xl border border-white/6 bg-[#12121e] py-3.5 pl-12 pr-4 text-sm text-foreground placeholder-muted outline-none transition-all focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 disabled:opacity-50"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/6 bg-[#16162a] py-1 shadow-xl shadow-black/40">
          {results.map((movie, i) => (
            <button
              key={movie.id}
              onClick={() => handleSelect(movie)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-accent-purple/15 text-foreground"
                  : "text-muted hover:bg-white/4 hover:text-foreground"
              }`}
            >
              <span className="font-medium text-foreground">{movie.title}</span>
              <span className="text-xs text-muted">({movie.year})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
