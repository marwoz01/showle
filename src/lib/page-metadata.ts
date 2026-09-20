import type { Metadata } from "next";
import { cookies } from "next/headers";
import { seoCopy, type PublicPagePath } from "@/i18n/seo";
import { siteUrl } from "@/lib/site";

export async function requestLocale(): Promise<"pl" | "en"> {
  return (await cookies()).get("showle-locale")?.value === "en" ? "en" : "pl";
}

export async function publicPageMetadata(path: PublicPagePath): Promise<Metadata> {
  const locale = await requestLocale();
  const [title, description] = seoCopy[locale][path];
  const url = new URL(path, siteUrl());
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Showle", type: "website", locale: locale === "pl" ? "pl_PL" : "en_US", images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}
