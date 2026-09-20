import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { legalIdentity } from "@/lib/legal-config";
import { legalCopy } from "@/i18n/legal";

export default async function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const identity = legalIdentity();
  // Never publish an invented operator or incomplete contact details.
  if (!identity || process.env.SHOWLE_LEGAL_READY !== "true") notFound();
  const locale = (await cookies()).get("showle-locale")?.value === "en" ? "en" : "pl";
  const copy = legalCopy[locale];
  return <article className="mx-auto max-w-3xl space-y-7">
    <header><h1 className="text-3xl font-semibold">{kind === "privacy" ? copy.privacyTitle : copy.termsTitle}</h1>
      <p className="mt-2 text-xs text-muted">{copy.updated}</p></header>
    <p className="text-sm leading-relaxed text-muted">{copy.controller} {identity.controller}.
      {" "}{copy.contact}: <a href={`mailto:${identity.email}`} className="text-accent-purple underline">{identity.email}</a></p>
    {copy[kind].map(([title, text]) => <section key={title} className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2><p className="text-sm leading-relaxed text-muted">{text}</p>
    </section>)}
  </article>;
}
