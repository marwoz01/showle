"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation, Locale } from "@/i18n";

type IconComponent = React.FC<{ active: boolean }>;

interface NavItem {
  key: string;
  icon: IconComponent;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", icon: HomeIcon, href: "/" },
  { key: "play", icon: PlayIcon, href: "/play/movie" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navLabel = (key: string) => t.nav[key as keyof typeof t.nav] || key;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/6 bg-[#0c0c14]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/20">
          <span className="text-sm">🎬</span>
        </div>
        <span className="font-display text-lg font-bold tracking-wider text-foreground">
          Showle
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-purple/15 text-foreground"
                  : "text-muted hover:bg-white/4 hover:text-foreground"
              }`}
            >
              <item.icon active={active} />
              {navLabel(item.key)}
              {active && (
                <div className="absolute left-0 h-8 w-0.75 rounded-r-full bg-accent-purple" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Language toggle */}
      <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 p-1">
        {(["pl", "en"] as Locale[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLocale(lang)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              locale === lang
                ? "bg-accent-purple/20 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.lang[lang]}
          </button>
        ))}
      </div>

      {/* Unlock Pro */}
      <div className="mx-3 mb-4 rounded-xl border border-white/6 bg-white/3 p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-accent-purple">✦</span> {t.pro.title}
        </div>
        <p className="mb-3 text-xs text-muted">
          {t.pro.description}
        </p>
        <button className="w-full rounded-lg bg-accent-purple py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90">
          {t.pro.upgrade}
        </button>
      </div>

      {/* Auth button */}
      <div className="border-t border-white/6 px-4 py-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/6 bg-white/3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/6">
          <UserIcon />
          {t.nav.login}
        </button>
      </div>
    </aside>
  );
}

/* ── Icons ── */

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M10 8l6 4-6 4V8z" />
    </svg>
  );
}
