"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Bookmark } from "@/components/ui/icons";

interface WatchlistSourceProps {
  checked: boolean;
  signedIn: boolean;
  count: number | null;
  onChange: (checked: boolean) => void;
}

export default function WatchlistSource({ checked, signedIn, count, onChange }: WatchlistSourceProps) {
  const { t } = useTranslation();
  return (
    <div className={`rounded-2xl p-4 ${checked ? "bg-accent-purple/10" : "bg-white/4"}`}>
      <label className="flex min-h-12 cursor-pointer items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple"><Bookmark size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t.recommendation.watchlistOnly}</span>
        </span>
        <span className="relative flex h-11 w-11 shrink-0 items-center">
          <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)}
            aria-label={t.recommendation.watchlistOnly} aria-describedby="watchlist-source-help"
            className="peer absolute inset-0 z-10 cursor-pointer opacity-0" />
          <span aria-hidden="true" className="flex h-6 w-11 items-center rounded-full bg-white/15 peer-checked:bg-accent-purple peer-focus-visible:ring-2 peer-focus-visible:ring-accent-purple peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card">
            <span className={`h-4 w-4 rounded-full bg-white ${checked ? "translate-x-6" : "translate-x-1"}`} />
          </span>
        </span>
      </label>
      <p id="watchlist-source-help" className="mt-2 text-xs leading-5 text-muted">{t.recommendation.watchlistHint}</p>
      {checked && <div className="mt-3 text-xs leading-5">
        {!signedIn ? <p><Link href="/sign-in" className="text-accent-purple underline">{t.recommendation.watchlistLogin}</Link></p>
          : count === 0 ? <p className="text-muted">{t.recommendation.watchlistEmpty} <Link href="/collection?tab=watchlist" className="text-accent-purple underline">{t.collection.title}</Link></p>
          : count !== null ? <p className="text-muted">{t.recommendation.watchlistCount(count)}</p> : null}
      </div>}
    </div>
  );
}
