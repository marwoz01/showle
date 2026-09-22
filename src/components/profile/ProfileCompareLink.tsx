"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n";
import { UserRound } from "@/components/ui/icons";

export default function ProfileCompareLink() {
  const { t } = useTranslation();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6"><UserRound size={24} className="text-accent-purple" /><h2 className="font-display text-xl font-semibold">{t.profile.compare}</h2><p className="text-sm leading-relaxed text-muted">{t.profile.compareHint}</p>
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      let slug = value.trim();
      if (slug.includes("/")) {
        try {
          const url = new URL(slug, window.location.origin);
          if (![window.location.origin, "https://showle.vercel.app"].includes(url.origin)) throw new Error("origin");
          const match = url.pathname.match(/^\/u\/([a-z0-9-]+)\/?$/);
          if (!match) throw new Error("path");
          slug = match[1];
        } catch { setError(true); return; }
      }
      if (!/^[a-z0-9-]{3,64}$/.test(slug)) { setError(true); return; }
      router.push(`/u/${encodeURIComponent(slug)}#compare`);
    }}><label className="block space-y-2 text-xs text-muted">{t.profile.friendLink}<input value={value} onChange={(event) => { setValue(event.target.value); setError(false); }} maxLength={250} className="min-h-12 w-full rounded-xl border border-white/8 bg-white/3 px-3 text-base text-foreground outline-accent-purple sm:text-sm" /></label><button className="min-h-11 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold" disabled={!value.trim()}>{t.profile.compareAction}</button></form>
    {error && <p role="alert" className="text-sm text-muted">{t.profile.invalidLink}</p>}
  </section>;
}
