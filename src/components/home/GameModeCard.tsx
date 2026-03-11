import Link from "next/link";

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
  },
  purple: {
    iconBg: "bg-accent-purple/15",
    iconColor: "text-accent-purple",
    link: "text-accent-purple",
    badge: "bg-accent-purple/15 text-accent-purple",
  },
  cyan: {
    iconBg: "bg-accent-cyan/15",
    iconColor: "text-accent-cyan",
    link: "text-accent-cyan",
    badge: "bg-accent-cyan/15 text-accent-cyan",
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
  const cardClassName = `group flex flex-col justify-between rounded-2xl border border-white/6 bg-[#12121e] p-6 transition-all duration-200 ${
    disabled
      ? "cursor-not-allowed opacity-70"
      : "hover:border-white/12 hover:bg-[#16162a]"
  }`;
  const actionClassName = `text-sm font-semibold transition-all ${
    disabled ? "text-muted" : `${accent.link} group-hover:underline`
  }`;
  const content = (
    <>
      <div>
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
        <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>

        {/* Description */}
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>

      {/* Action link */}
      <div className="mt-6">
        <span className={actionClassName}>
          {actionLabel}
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
