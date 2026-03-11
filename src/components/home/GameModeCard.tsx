import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface GameModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  badge?: string;
  accentColor: "green" | "purple" | "cyan";
  disabled?: boolean;
}

const accentMap = {
  green: {
    iconBg: "bg-accent-green/15",
    iconColor: "text-accent-green",
    link: "text-accent-green",
    badge: "bg-accent-green/15 text-accent-green",
    glowColor: "rgba(0, 230, 118, 0.4)",
    borderColor: "rgba(0, 230, 118, 0.5)",
  },
  purple: {
    iconBg: "bg-accent-purple/15",
    iconColor: "text-accent-purple",
    link: "text-accent-purple",
    badge: "bg-accent-purple/15 text-accent-purple",
    glowColor: "rgba(124, 77, 255, 0.4)",
    borderColor: "rgba(124, 77, 255, 0.5)",
  },
  cyan: {
    iconBg: "bg-accent-cyan/15",
    iconColor: "text-accent-cyan",
    link: "text-accent-cyan",
    badge: "bg-accent-cyan/15 text-accent-cyan",
    glowColor: "rgba(0, 188, 212, 0.4)",
    borderColor: "rgba(0, 188, 212, 0.5)",
  },
};

export default function GameModeCard({
  icon,
  title,
  description,
  href,
  actionLabel,
  badge,
  accentColor,
  disabled = false,
}: GameModeCardProps) {
  const accent = accentMap[accentColor];

  const cardClassName = `group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/6 bg-card p-6 transition-all duration-300 ${
    disabled
      ? "cursor-not-allowed opacity-70"
      : "hover:bg-card-hover"
  }`;

  const actionClassName = `inline-flex items-center gap-1 text-sm font-semibold transition-all ${
    disabled ? "text-muted" : accent.link
  }`;

  const content = (
    <>
      {/* Top glow border — visible on hover */}
      {!disabled && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent.borderColor}, transparent)`,
          }}
        />
      )}

      {/* Ambient glow — visible on hover */}
      {!disabled && (
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20"
          style={{ background: accent.glowColor }}
        />
      )}

      <div className="relative">
        {/* Top row: icon + badge */}
        <div className="mb-5 flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.iconBg}`}
          >
            <span className={accent.iconColor}>{icon}</span>
          </div>
          {badge && (
            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${accent.badge}`}
            >
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
        <span className={actionClassName}>
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
