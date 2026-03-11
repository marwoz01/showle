"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation, Locale } from "@/i18n";
import {
  Clapperboard,
  Home,
  Play,
  Sparkles,
  User,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  key: string;
  icon: React.FC<{ className?: string }>;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", icon: Home, href: "/" },
  { key: "play", icon: Play, href: "/play/movie" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close sidebar on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navLabel = (key: string) => t.nav[key as keyof typeof t.nav] || key;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8">
            <Clapperboard size={16} />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            Showle
          </span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground lg:hidden"
        >
          <X size={20} />
        </button>
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
                  ? "text-foreground"
                  : "text-muted hover:bg-white/4 hover:text-foreground"
              }`}
              style={
                active
                  ? { background: "linear-gradient(to right, rgba(124, 77, 255, 0.15), transparent)" }
                  : undefined
              }
            >
              <item.icon
                className={`h-4.5 w-4.5 ${active ? "text-accent-purple" : ""}`}
              />
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
                ? "bg-white/10 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.lang[lang]}
          </button>
        ))}
      </div>

      {/* Unlock Pro */}
      <div className="mx-3 mb-4 rounded-xl border border-white/6 bg-white/4 p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-accent-purple">
            <Sparkles size={16} />
          </span>
          {t.pro.title}
        </div>
        <p className="mb-3 text-xs text-muted">{t.pro.description}</p>
        <button className="w-full rounded-lg bg-accent-purple py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90">
          {t.pro.upgrade}
        </button>
      </div>

      {/* Auth button */}
      <div className="border-t border-white/6 px-4 py-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/6 bg-white/3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/6">
          <User size={16} />
          {t.nav.login}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center gap-3 border-b border-white/6 bg-background px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
            <Clapperboard size={14} />
          </div>
          <span className="font-display text-base font-bold text-foreground">
            Showle
          </span>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide in */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r border-white/6 bg-background transition-transform duration-300 ease-in-out lg:w-60 lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
