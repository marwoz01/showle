import { normalizeDisplayText } from "@/lib/typography";

/** A short introduction for display; keep the full overview in the movie data. */
export function shortenSynopsis(text: string, locale = "pl", maxLength = 280): string {
  const synopsis = normalizeDisplayText(text).replace(/\s+/g, " ").trim();
  if (!synopsis) return "";

  const sentences = typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(locale, { granularity: "sentence" }).segment(synopsis),
      ({ segment }) => segment.trim())
    : synopsis.match(/[^.!?]+(?:[.!?]+[\u201d\u2019"']*|$)/g)?.map((sentence) => sentence.trim()) ?? [synopsis];

  let summary = "";
  for (const sentence of sentences.slice(0, 2)) {
    const candidate = summary ? `${summary} ${sentence}` : sentence;
    if (candidate.length > maxLength) break;
    summary = candidate;
  }
  if (summary) return summary;

  const prefix = synopsis.slice(0, maxLength - 1);
  const lastSpace = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, lastSpace > 0 ? lastSpace : prefix.length).replace(/[,;:\s-]+$/, "")}\u2026`;
}
