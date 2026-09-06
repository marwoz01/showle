"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useId } from "react";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { Film, Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  onSelect: (movie: MovieSuggestion) => void;
  disabled?: boolean;
}
export default function SearchBar({ onSelect, disabled }: SearchBarProps) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setResults([]);
    setActive(-1);
    setError(false);
    if (query.trim().length < 2 || disabled) { setLoading(false); setOpen(false); return; }
    const ac = new AbortController();
    setLoading(true);
    setOpen(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query.trim())}&lang=${locale}`, { signal: ac.signal });
        if (!response.ok) throw new Error("search");
        const movies: MovieSuggestion[] = await response.json();
        if (!ac.signal.aborted) setResults(movies);
      } catch {
        if (!ac.signal.aborted) setError(true);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [query, locale, disabled, retry]);

  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function select(movie: MovieSuggestion) {
    if (disabled || loading) return;
    onSelect(movie);
    setQuery(""); setResults([]); setOpen(false); setActive(-1);
    inputRef.current?.focus();
  }

  return <div ref={containerRef} className="relative w-full"
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) { setOpen(false); setActive(-1); } }}>
    <div className="relative">
      {loading ? <Loader2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-muted" /> : <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />}
      <input ref={inputRef} role="combobox" aria-label={t.game.searchPlaceholder} aria-autocomplete="list"
        aria-expanded={open} aria-controls={listId} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off" placeholder={t.game.searchPlaceholder} value={query} disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length) {
            event.preventDefault(); setOpen(true);
            setActive((previous) => event.key === "ArrowDown" ? Math.min(previous + 1, results.length - 1) : Math.max(previous - 1, 0));
          }
          if (event.key === "Enter" && open && active >= 0 && results[active]) { event.preventDefault(); select(results[active]); }
        }}
        className="w-full rounded-xl border border-white/6 bg-card py-3.5 pl-12 pr-4 text-base text-foreground outline-none placeholder:text-muted focus:border-accent-purple/50 focus:ring-2 focus:ring-accent-purple/20 disabled:opacity-50 sm:text-sm" />
    </div>
    <span role="status" className="sr-only">{loading ? copy.searchLoading : error ? copy.searchError : query.length >= 2 ? copy.searchResults(results.length) : ""}</span>
    {open && <div className="soft-card absolute z-50 mt-2 w-full overflow-hidden rounded-xl bg-card-hover p-1">
      {loading ? <p className="px-4 py-5 text-sm text-muted">{copy.searchLoading}</p>
        : error ? <div role="alert" className="px-4 py-5 text-sm text-muted">{copy.searchError} <button onClick={() => setRetry((n) => n + 1)} className="text-accent-purple underline">{t.common.tryAgain}</button></div>
        : !results.length ? <p className="px-4 py-5 text-sm text-muted">{copy.searchEmpty}</p> : null}
      <ul id={listId} role="listbox" aria-label={t.game.searchPlaceholder} className="max-h-80 overflow-y-auto">
        {results.map((movie, index) => <li key={movie.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
          onMouseDown={(event) => event.preventDefault()} onClick={() => select(movie)} onMouseMove={() => setActive(index)}
          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === active ? "bg-accent-purple/15" : "hover:bg-white/5"}`}>
          <span className="relative flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/5">
            {movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`} alt="" fill sizes="32px" className="object-cover" /> : <Film size={14} />}
          </span>
          <span className="min-w-0"><span className="block font-medium text-foreground">{movie.title}</span>
            <span className="block text-xs text-muted">{movie.year}{movie.originalTitle !== movie.title ? ` · ${movie.originalTitle}` : ""}</span>
          </span>
        </li>)}
      </ul>
    </div>}
  </div>;
}
