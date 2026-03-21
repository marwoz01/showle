"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "@/i18n";
import { MOVIE_GENRES } from "@/constants/genres";
import { Sparkles, Flame, Target, FlaskConical } from "lucide-react";

interface PreferenceFormProps {
  onSubmit: (preferences: {
    genres: string[];
    yearFrom: number;
    yearTo: number;
    popularity: string;
  }) => void;
  initialGenres?: string[];
  initialYearFrom?: number;
  initialYearTo?: number;
  initialPopularity?: string;
}

const YEAR_MIN = 1920;
const YEAR_MAX = 2026;

const YEAR_PRESETS = [
  { key: "any", from: 1920, to: 2026 },
  { key: "90s", from: 1990, to: 1999 },
  { key: "2000s", from: 2000, to: 2009 },
  { key: "2010s", from: 2010, to: 2019 },
  { key: "recent", from: 2020, to: 2026 },
] as const;

export default function PreferenceForm({
  onSubmit,
  initialGenres = [],
  initialYearFrom = YEAR_MIN,
  initialYearTo = YEAR_MAX,
  initialPopularity = "popular",
}: PreferenceFormProps) {
  const { t } = useTranslation();
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [yearFrom, setYearFrom] = useState(initialYearFrom);
  const [yearTo, setYearTo] = useState(initialYearTo);
  const [popularity, setPopularity] = useState(initialPopularity);

  const popularityOptions = [
    {
      key: "popular",
      label: t.recommend.popularityPopular,
      desc: t.recommend.popularityPopularDesc,
      icon: <Flame size={18} />,
    },
    {
      key: "medium",
      label: t.recommend.popularityMedium,
      desc: t.recommend.popularityMediumDesc,
      icon: <Target size={18} />,
    },
    {
      key: "niche",
      label: t.recommend.popularityNiche,
      desc: t.recommend.popularityNicheDesc,
      icon: <FlaskConical size={18} />,
    },
  ];

  const presetLabels: Record<string, string> = {
    any: t.recommend.yearAny,
    "90s": "90s",
    "2000s": "2000s",
    "2010s": "2010s",
    recent: "2020+",
  };

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  }

  function handleSubmit() {
    onSubmit({ genres: selectedGenres, yearFrom, yearTo, popularity });
  }

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), yearTo - 1);
      setYearFrom(val);
    },
    [yearTo]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), yearFrom + 1);
      setYearTo(val);
    },
    [yearFrom]
  );

  function applyPreset(preset: (typeof YEAR_PRESETS)[number]) {
    setYearFrom(preset.from);
    setYearTo(preset.to);
  }

  const canSubmit = selectedGenres.length >= 1;
  const minPercent = ((yearFrom - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
  const maxPercent = ((yearTo - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;

  return (
    <div className="space-y-5">
      {/* ── Genres (primary) ── */}
      <section className="rounded-2xl border border-white/6 bg-card p-6 sm:p-8">
        <label className="mb-5 block text-xs font-semibold uppercase tracking-widest text-muted">
          {t.recommend.genresLabel}
        </label>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {MOVIE_GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`relative rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03] ${
                  selected
                    ? "border-accent-purple/50 bg-accent-purple/15 text-accent-purple shadow-[0_0_20px_rgba(124,77,255,0.15)]"
                    : "border-white/8 bg-white/3 text-muted hover:border-white/15 hover:bg-white/6 hover:text-foreground"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {!canSubmit && (
          <p className="mt-4 text-xs text-muted">{t.recommend.selectGenre}</p>
        )}
      </section>

      {/* ── Popularity + Year (secondary, side by side) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Popularity */}
        <section className="rounded-2xl border border-white/6 bg-card p-6">
          <label className="mb-4 block text-xs font-semibold uppercase tracking-widest text-muted">
            {t.recommend.popularityLabel}
          </label>

          <div className="space-y-2.5">
            {popularityOptions.map((opt) => {
              const selected = popularity === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setPopularity(opt.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                    selected
                      ? "border-accent-purple/50 bg-accent-purple/10 shadow-[0_0_16px_rgba(124,77,255,0.1)]"
                      : "border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selected
                        ? "bg-accent-purple/20 text-accent-purple"
                        : "bg-white/5 text-muted"
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-semibold ${
                        selected ? "text-accent-purple" : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-xs text-muted">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Year range */}
        <section className="rounded-2xl border border-white/6 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted">
              {t.recommend.yearLabel}
            </label>
            <span className="text-sm font-bold text-foreground">
              {yearFrom} – {yearTo}
            </span>
          </div>

          {/* Slider */}
          <div className="relative mb-5 h-8">
            <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/8" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent-purple shadow-[0_0_10px_rgba(124,77,255,0.4)]"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`,
              }}
            />
            <input
              type="range"
              min={YEAR_MIN}
              max={YEAR_MAX}
              value={yearFrom}
              onChange={handleMinChange}
              className="range-slider pointer-events-none absolute top-0 h-8 w-full appearance-none bg-transparent"
              style={{ zIndex: yearFrom > YEAR_MAX - 5 ? 5 : 3 }}
            />
            <input
              type="range"
              min={YEAR_MIN}
              max={YEAR_MAX}
              value={yearTo}
              onChange={handleMaxChange}
              className="range-slider pointer-events-none absolute top-0 h-8 w-full appearance-none bg-transparent"
              style={{ zIndex: 4 }}
            />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {YEAR_PRESETS.map((preset) => {
              const active =
                yearFrom === preset.from && yearTo === preset.to;
              return (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-accent-purple/40 bg-accent-purple/15 text-accent-purple"
                      : "border-white/8 bg-white/3 text-muted hover:bg-white/6 hover:text-foreground"
                  }`}
                >
                  {presetLabels[preset.key]}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── CTA ── */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="group/cta relative w-full overflow-hidden rounded-2xl bg-linear-to-r from-accent-purple to-purple-500 px-8 py-4.5 text-base font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(124,77,255,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <div className="pointer-events-none absolute inset-0 bg-white/0 transition-colors group-hover/cta:bg-white/5" />
        <span className="relative inline-flex items-center justify-center gap-2.5">
          <Sparkles size={20} />
          {t.recommend.submit}
        </span>
      </button>

      {/* Range slider thumb styles */}
      <style jsx>{`
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: all;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid #7c4dff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(124, 77, 255, 0.4),
            0 1px 4px rgba(0, 0, 0, 0.3);
        }
        .range-slider::-moz-range-thumb {
          pointer-events: all;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 3px solid #7c4dff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(124, 77, 255, 0.4),
            0 1px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
