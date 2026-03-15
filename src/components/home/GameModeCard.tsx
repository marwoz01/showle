import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface GameModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  badge?: string;
  disabled?: boolean;
}

export default function GameModeCard({
  icon,
  title,
  description,
  href,
  actionLabel,
  badge,
  disabled = false,
}: GameModeCardProps) {
  const cardClassName = `group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/6 bg-card p-6 transition-all duration-300 ${
    disabled
      ? "cursor-not-allowed opacity-70"
      : "hover:bg-card-hover"
  }`;

  const content = (
    <>
      {/* Top glow border — visible on hover */}
      {!disabled && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(124, 77, 255, 0.5), transparent)",
          }}
        />
      )}

      {/* Ambient glow — visible on hover */}
      {!disabled && (
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full bg-accent-purple/40 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20"
        />
      )}

      <div className="relative">
        {/* Top row: icon + badge */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-purple/15">
            <span className="text-accent-purple">{icon}</span>
          </div>
          {badge && (
            <span className="rounded-md bg-accent-purple/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-purple">
              {badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>

        {/* Description */}
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>

      {/* Action link with sliding arrow */}
      <div className="relative mt-6">
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold transition-all ${
            disabled ? "text-muted" : "text-accent-purple"
          }`}
        >
          {actionLabel}
          {!disabled && (
            <ArrowRight
              size={16}
              strokeWidth={2.5}
              className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
            />
          )}
        </span>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div aria-disabled="true" className={cardClassName}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={cardClassName}>
      {content}
    </Link>
  );
}
