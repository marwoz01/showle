import GameModeCard from "@/components/home/GameModeCard";
import HowItWorks from "@/components/home/HowItWorks";

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Page header */}
      <div>
        <h1 className="mb-2 text-4xl font-bold text-foreground">Play</h1>
        <p className="max-w-xl text-base text-muted">
          Test your cinematic knowledge. Identify movies and series from obscure
          frames, quotes, or posters.
        </p>
      </div>

      {/* Filter / View row (decorative for now) */}
      <div className="flex items-center justify-end gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06]">
          <FilterIcon />
          Filter
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06]">
          <GridIcon />
          View: Grid
          <ChevronIcon />
        </button>
      </div>

      {/* Game mode cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <GameModeCard
          icon={<FilmIcon />}
          title="Daily Movie"
          description="Guess today's featured film from five progressively easier visual clues. Resets at midnight."
          href="/play/movie"
          actionLabel="Play Challenge"
          badge="Popular"
          accentColor="green"
        />
        <GameModeCard
          icon={<TvIcon />}
          title="Daily Series"
          description="Identify the TV show episode of the day based on iconic quotes and blurred cast members."
          href="/play/series"
          actionLabel="Play Challenge"
          badge="New"
          accentColor="purple"
        />
        <GameModeCard
          icon={<InfinityIcon />}
          title="Unlimited"
          description="Can't get enough? Play endlessly through our entire catalog of thousands of titles at your own pace."
          href="/play/unlimited"
          actionLabel="Start Endless Run"
          accentColor="cyan"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* How It Works */}
      <HowItWorks />
    </div>
  );
}

/* ── Icons ── */

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 2v20" />
      <path d="M17 2v20" />
      <path d="M2 12h20" />
      <path d="M2 7h5" />
      <path d="M2 17h5" />
      <path d="M17 7h5" />
      <path d="M17 17h5" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
    </svg>
  );
}
