const STEPS = [
  {
    step: "01",
    title: "Choose a Mode",
    description:
      "Pick Daily Movie, Daily Series, or play endlessly in Unlimited mode.",
    icon: <TargetIcon />,
  },
  {
    step: "02",
    title: "Guess the Title",
    description:
      "Type a movie or series name. We'll compare it against the answer across 7 parameters.",
    icon: <SearchIcon />,
  },
  {
    step: "03",
    title: "Read the Clues",
    description:
      "Each wrong guess reveals a new hint — director initials, genre, country, and more.",
    icon: <LightbulbIcon />,
  },
  {
    step: "04",
    title: "Share Your Score",
    description:
      "Nailed it? Share your result grid with friends and compare streaks.",
    icon: <TrophyIcon />,
  },
];

export default function HowItWorks() {
  return (
    <section>
      <h2 className="mb-2 text-2xl font-bold text-foreground">How It Works</h2>
      <p className="mb-8 text-sm text-muted">
        Three simple steps to prove your expertise.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <div
            key={step.step}
            className="rounded-2xl border border-white/[0.06] bg-[#12121e] p-5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-muted">
              {step.icon}
            </div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-purple">
              Step {step.step}
            </p>
            <h3 className="mb-2 text-base font-bold text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Icons ── */

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
