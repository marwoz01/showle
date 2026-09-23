"use client";

import { Gem } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { useGemWallet } from "@/hooks/useGemWallet";

export default function SidebarGemBalance() {
  const { isSignedIn } = useUser();
  const { displayedBalance, loading, error } = useGemWallet();
  const { t, locale } = useTranslation();
  if (!isSignedIn) return null;
  const amount = displayedBalance !== null ? new Intl.NumberFormat(locale).format(displayedBalance) : loading ? "…" : "?";
  return <span data-gem-wallet-target role="img" aria-label={displayedBalance !== null ? t.gems.balanceLabel(amount) : error ? t.gems.loadError : t.gems.title}
    className="inline-flex shrink-0 items-center gap-1 text-gem-blue">
    <Gem data-gem-wallet-icon size={16} fill="currentColor" fillOpacity={0.15} aria-hidden="true" />
    <span className="text-xs font-semibold tabular-nums">{amount}</span>
  </span>;
}
