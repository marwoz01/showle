import Link from "next/link";
import { creditsCopy } from "@/i18n/credits";
import { legalIdentity } from "@/lib/legal-config";

export default function Footer({ locale }: { locale: "pl" | "en" }) {
  const t = creditsCopy[locale];
  const identity = legalIdentity();
  const legalReady = process.env.SHOWLE_LEGAL_READY === "true" && identity;
  return (
    <footer className="relative mt-14 border-t border-white/6 pt-6 text-xs text-muted">
      <nav aria-label={t.title} className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/credits" className="py-2 hover:text-foreground">{t.credits}</Link>
        <Link href="/settings" className="py-2 hover:text-foreground">{t.settings}</Link>
        {legalReady && <>
          <Link href="/privacy" className="py-2 hover:text-foreground">{t.privacy}</Link>
          <Link href="/terms" className="py-2 hover:text-foreground">{t.terms}</Link>
        </>}
        {identity && <a href={`mailto:${identity.email}`} className="py-2 hover:text-foreground">{t.contact}</a>}
      </nav>
      <p className="mt-3">{t.notice}</p>
      <p className="mt-1">TMDB · <a href="https://www.justwatch.com/pl" className="hover:text-foreground">JustWatch</a></p>
    </footer>
  );
}
