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
  { key: "play", icon: PlayIcon, href: "/play" },
  { key: "notifications", icon: BellIcon, href: "/notifications" },
  { key: "stats", icon: StatsIcon, href: "/stats" },
  { key: "settings", icon: SettingsIcon, href: "/settings" },
];

const OTHER_ITEMS: NavItem[] = [
  { key: "documentation", icon: DocIcon, href: "/docs" },
  { key: "referFriend", icon: ShareIcon, href: "/refer" },
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

      {/* Other section */}
      <div className="mt-6 px-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/60">
          {t.nav.other}
        </p>
        {OTHER_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/4 hover:text-foreground"
          >
            <item.icon active={false} />
            {navLabel(item.key)}
          </Link>
        ))}
      </div>

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

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function DocIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ShareIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C4DFF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
