"use client";

import { Gem } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { useGemWallet } from "@/hooks/useGemWallet";

export default function SidebarGemBalance() {
  const { isSignedIn } = useUser();
  const { wallet, loading, error } = useGemWallet();
  const { t, locale } = useTranslation();
  if (!isSignedIn) return null;
  const amount = wallet ? new Intl.NumberFormat(locale).format(wallet.balance) : loading ? "…" : "?";
  return <span role="img" aria-label={wallet ? t.gems.balanceLabel(amount) : error ? t.gems.loadError : t.gems.title}
    className="inline-flex shrink-0 items-center gap-1 text-gem-blue">
    <Gem size={16} fill="currentColor" fillOpacity={0.15} aria-hidden="true" />
    <span className="text-xs font-semibold tabular-nums">{amount}</span>
  </span>;
}
