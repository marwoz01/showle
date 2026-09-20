import { publicPageMetadata, requestLocale } from "@/lib/page-metadata";
import { creditsCopy } from "@/i18n/credits";

export const generateMetadata = () => publicPageMetadata("/credits");
export default async function CreditsPage() {
  const t = creditsCopy[await requestLocale()];
  return (
    <article className="relative max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t.title}</h1>
      <section className="soft-panel space-y-3 rounded-2xl p-6">
        <h2 className="text-xl font-semibold">TMDB</h2>
        <p className="text-sm leading-relaxed text-muted">{t.movies}</p>
        <p className="text-sm leading-relaxed">{t.notice}</p>
        <a href="https://www.themoviedb.org" className="inline-block py-2 text-sm text-accent-purple">{t.tmdbLink}</a>
      </section>
      <section className="soft-panel space-y-3 rounded-2xl p-6">
        <h2 className="text-xl font-semibold">JustWatch</h2>
        <p className="text-sm leading-relaxed text-muted">{t.streaming}</p>
        <p className="text-sm leading-relaxed text-muted">{t.availability}</p>
        <a href="https://www.justwatch.com/pl" className="inline-block py-2 text-sm text-accent-purple">{t.justWatchLink}</a>
      </section>
    </article>
  );
}
