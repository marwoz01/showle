import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { seoCopy } from "@/i18n/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(seoCopy.pl).map((path) => ({
    url: new URL(path, siteUrl()).href,
    changeFrequency: path === "/play/movie" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/play/movie" ? 0.9 : 0.6,
  }));
}
