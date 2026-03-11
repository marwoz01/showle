import Link from "next/link";
import { GAME_MODES } from "@/constants";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_#141420_0%,_#0A0A0F_70%)]" />

      <main className="relative z-10 flex w-full max-w-md flex-col items-center gap-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-5xl font-bold tracking-[0.3em] text-foreground">
            SHOWLE
          </h1>
          <p className="text-sm tracking-wide text-muted">
            Guess the screen. One title a day.
          </p>
        </div>

        {/* Game mode buttons */}
        <div className="flex w-full flex-col gap-4">
          {GAME_MODES.map((mode) => (
            <Link
              key={mode.id}
              href={mode.href}
              className="group relative flex items-center gap-4 rounded-xl border border-card-border bg-card px-6 py-5 transition-all duration-200 hover:scale-[1.02] hover:border-transparent"
            >
              {/* Left accent bar */}
              <div
                className={`absolute left-0 top-0 h-full w-1 rounded-l-xl bg-${mode.accentColor}`}
              />

              <span className="text-2xl">{mode.icon}</span>

              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground">
                  {mode.label}
                </span>
                <span className="text-sm text-muted">{mode.description}</span>
              </div>

              {/* Arrow */}
              <span className="ml-auto text-muted transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
          ))}
        </div>

        {/* Bottom links */}
        <div className="flex gap-8">
          <button className="text-sm text-muted transition-colors hover:text-foreground">
            📖 Zasady
          </button>
          <button className="text-sm text-muted transition-colors hover:text-foreground">
            📊 Statystyki
          </button>
        </div>
      </main>
    </div>
  );
}
