export interface RecommendationIntent {
  includedGenres: string[];
  excludedGenres: string[];
  queryEnglish: string;
  maxRuntime: number | null;
  source: "ai" | "local";
}

export function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/ł/g, "l").normalize("NFKD").replace(/\p{M}/gu, "");
}

const GENRE_PATTERNS: [string, string][] = [
  ["Horror", "horrors?|horroru|horrory|horrorow|scary"],
  ["Thriller", "thrillers?|thrillera|thrillery|thrillerow|suspense"],
  ["Romance", "romance|romantic|romans(?:u|e|ow)?|romantyczn[a-z]*|milosn[a-z]*"],
  ["Comedy", "comed(?:y|ies)|funny|komedi[a-z]*"],
  ["Crime", "crime|gangster[a-z]*|kryminal[a-z]*"],
  ["Mystery", "mystery|mysteries|detective|whodunit|detektywistyczn[a-z]*"],
  ["War", "war|military|wojn[a-z]*|wojenn[a-z]*"],
  ["Animation", "animation|animated|cartoons?|animacj[a-z]*|animowan[a-z]*"],
  ["Documentary", "documentar(?:y|ies)|dokument(?:aln[a-z]*|y|ow|u)?"],
  ["Drama", "dramas?|dramat(?:y|u|ow|yczn[a-z]*)?"],
  ["Science Fiction", "sci[ -]?fi|science fiction|fantastyk[a-z]* naukow[a-z]*"],
  ["Fantasy", "fantasy"],
  ["Action", "action|akcj[a-z]*|sensacyjn[a-z]*"],
  ["Adventure", "adventure|przygodow[a-z]*"],
  ["Western", "westerns?|westerny|westernow"],
];

function isNegated(prefix: string): boolean {
  // Clause boundaries stop "no horror, but comedy" from negating comedy too.
  const clause = prefix.replace(/\bno longer than\s*\d+(?:[.,]\d+)?\s*(?:minutes?|min|hours?|h)\b/g, "")
    .split(/[.!?;]|\b(?:but|however|instead|ale|tylko|natomiast|jednak|za to)\b/u).at(-1) ?? "";
  const withoutNotOnly = clause.replace(/\b(?:not only|nie tylko)\b/g, "");
  const matches = [...withoutNotOnly.matchAll(/\b(?:bez|zadn[a-z]*|nie chce|nie lubie|nie|no|not|without|avoid|excluding|except)\b/g)];
  const last = matches.at(-1);
  if (!last) return false;
  const tail = withoutNotOnly.slice((last.index ?? 0) + last[0].length);
  return !/\b(?:with|including|z|lubie|chce)\b/.test(tail) && tail.trim().split(/\s+/).length <= 8;
}

export function inferRecommendationIntent(text: string): RecommendationIntent {
  const normalized = normalizeQuery(text);
  const included = new Set<string>();
  const excluded = new Set<string>();
  for (const [genre, pattern] of GENRE_PATTERNS) {
    for (const match of normalized.matchAll(new RegExp(`\\b(?:${pattern})\\b`, "g"))) {
      (isNegated(normalized.slice(0, match.index)) ? excluded : included).add(genre);
    }
  }
  const minutes = normalized.match(/\b(?:do|maks(?:ymalnie)?\.?|max(?:imum)?|under|at most|up to|no longer than)\s*(\d{2,3})\s*(?:minut[a-z]*|minutes?|min)\b/);
  const hours = normalized.match(/\b(?:do|maks(?:ymalnie)?\.?|max(?:imum)?|under|at most|up to|no longer than)\s*(\d(?:[.,]\d)?)\s*(?:godzin[a-z]*|hours?|h)\b/);
  const runtime = minutes ? Number(minutes[1]) : hours ? Math.floor(Number(hours[1].replace(",", ".")) * 60) : null;
  return {
    includedGenres: [...included].filter((g) => !excluded.has(g)), excludedGenres: [...excluded],
    queryEnglish: text, maxRuntime: runtime && runtime >= 40 && runtime <= 360 ? runtime : null, source: "local",
  };
}

export function inferGenresFromText(text: string): string[] {
  return inferRecommendationIntent(text).includedGenres;
}
