"use client";

import Link from "next/link";
import { Gem } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { useGemWallet } from "@/hooks/useGemWallet";

export default function SidebarGemBalance({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { isSignedIn } = useUser();
  const { wallet, loading, error } = useGemWallet();
  const { t, locale } = useTranslation();
  if (!isSignedIn) return null;
  const amount = wallet ? new Intl.NumberFormat(locale).format(wallet.balance) : loading ? "…" : "?";
  return <Link href="/profile#gems" aria-label={wallet ? t.gems.balanceLabel(amount) : error ? t.gems.loadError : t.gems.title}
    onClick={() => { window.dispatchEvent(new Event("showle-open-gems")); onNavigate?.(); }}
    className={`flex min-h-10 items-center gap-2 rounded-xl border border-gem-blue/20 bg-gem-blue/8 text-gem-blue transition-colors hover:bg-gem-blue/15 focus-visible:outline-gem-blue ${compact ? "px-3 py-2" : "w-full px-3 py-2.5"}`}>
    <Gem size={compact ? 17 : 19} fill="currentColor" fillOpacity={0.15} aria-hidden="true" />
    {!compact && <span className="flex-1 text-xs font-medium">{t.gems.title}</span>}
    <span className="font-display text-sm font-bold tabular-nums">{amount}</span>
  </Link>;
}
