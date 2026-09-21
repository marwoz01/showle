"use client";

import Image from "next/image";
import { Check, UserRound } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import type { MatchStatus } from "@/types";

export default function DailyMoviePerson({ label, name, profilePath, status, celebrate = false }: {
  label: string; name?: string; profilePath?: string; status?: MatchStatus; celebrate?: boolean;
}) {
  const { t } = useTranslation();
  const exact = status === "exact" && Boolean(name);
  return (
    <div className="min-w-0 text-center" data-person-name={name} data-status={status}>
      <dt className="mb-3 min-h-3.5 text-[9px] font-medium uppercase leading-3.5 tracking-wider text-muted/65">{label}</dt>
      <dd>
        <span data-card-celebrate={celebrate && exact} className={`relative mx-auto block h-14 w-14 rounded-full sm:h-16 sm:w-16 ${exact ? "ring-2 ring-match-exact ring-offset-4 ring-offset-[#19191d] shadow-[0_0_18px_rgba(0,230,118,.12)]" : "ring-1 ring-white/8"}`}>
          <span className="relative block h-full w-full overflow-hidden rounded-full bg-white/5">
            {name && profilePath ? <Image src={`https://image.tmdb.org/t/p/w185${profilePath}`} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-muted/40"><UserRound size={23} /></span>}
          </span>
          {exact && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-match-exact text-background ring-2 ring-[#19191d]"><Check size={12} aria-hidden="true" /></span>}
        </span>
        <span className={`mt-3 block text-[11px] font-medium leading-4 [overflow-wrap:anywhere] ${exact ? "text-match-exact" : name ? "text-foreground/75" : "text-muted/40"}`}>{normalizeDisplayText(name ?? "?")}</span>
        {status && <span className="sr-only">. {t.game.mobile[status]}</span>}
      </dd>
    </div>
  );
}
