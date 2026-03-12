/**
 * Offline script to generate the eligible movies pool from TMDB.
 *
 * Usage:
 *   TMDB_API_KEY=xxx npx tsx scripts/generate-pool.ts
 *
 * Output: src/data/eligible-movies.json
 */

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error("Missing TMDB_API_KEY environment variable");
  process.exit(1);
}

const BASE_URL = "https://api.themoviedb.org/3";

interface DiscoverResult {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
}

interface DiscoverResponse {
  results: DiscoverResult[];
  total_pages: number;
}

interface EligibleMovie {
  id: number;
  title: string;
  score: number;
}

// Excluded genre IDs: Documentary (99), Music (10402), TV Movie (10770)
const EXCLUDED_GENRE_IDS = new Set([99, 10402, 10770]);

async function fetchPage(page: number): Promise<DiscoverResponse> {
  const params = new URLSearchParams({
    api_key: API_KEY!,
    language: "en-US",
    sort_by: "vote_count.desc",
    page: String(page),
    "vote_count.gte": "1500",
    "vote_average.gte": "6.0",
    include_adult: "false",
    with_runtime: "75",
  });

  // with_runtime filter: minimum 75 minutes
  // TMDB discover uses with_runtime.gte
  params.set("with_runtime.gte", "75");
  params.delete("with_runtime");

  const res = await fetch(`${BASE_URL}/discover/movie?${params}`);
  if (!res.ok) throw new Error(`TMDB error ${res.status}: ${await res.text()}`);
  return res.json();
}

function computeScore(
  popularity: number,
  voteCount: number,
  voteAverage: number,
  maxPopularity: number,
  maxVoteCount: number
): number {
  const normPop = popularity / maxPopularity;
  const normVotes = voteCount / maxVoteCount;
  const normRating = voteAverage / 10;
  return 0.45 * normPop + 0.35 * normVotes + 0.2 * normRating;
}

async function main() {
  console.log("Fetching movies from TMDB discover...");

  // Fetch first page to get total pages
  const first = await fetchPage(1);
  const totalPages = Math.min(first.total_pages, 50); // Cap at 50 pages (1000 movies)
  console.log(`Total pages available: ${first.total_pages}, fetching up to ${totalPages}`);

  let allMovies: DiscoverResult[] = [...first.results];

  // Fetch remaining pages with rate limiting
  for (let page = 2; page <= totalPages; page++) {
    if (page % 10 === 0) console.log(`  Fetching page ${page}/${totalPages}...`);
    await new Promise((r) => setTimeout(r, 250)); // Rate limit
    const data = await fetchPage(page);
    allMovies.push(...data.results);
  }

  console.log(`Fetched ${allMovies.length} movies total`);

  // Filter
  const filtered = allMovies.filter((m) => {
    if (!m.release_date) return false;
    if (!m.poster_path) return false;
    if (!m.overview || m.overview.length < 20) return false;
    if (m.adult) return false;
    if (m.genre_ids.some((g) => EXCLUDED_GENRE_IDS.has(g))) return false;
    return true;
  });

  console.log(`After filtering: ${filtered.length} movies`);

  // Compute scores
  const maxPopularity = Math.max(...filtered.map((m) => m.popularity));
  const maxVoteCount = Math.max(...filtered.map((m) => m.vote_count));

  const eligible: EligibleMovie[] = filtered
    .map((m) => ({
      id: m.id,
      title: m.title,
      score: Math.round(
        computeScore(m.popularity, m.vote_count, m.vote_average, maxPopularity, maxVoteCount) *
          1000
      ) / 1000,
    }))
    .sort((a, b) => b.score - a.score);

  // Write output
  const outputPath = new URL("../src/data/eligible-movies.json", import.meta.url);
  const { writeFileSync } = await import("fs");
  const { fileURLToPath } = await import("url");
  const outFile = fileURLToPath(outputPath);

  writeFileSync(outFile, JSON.stringify(eligible, null, 2));
  console.log(`\nWrote ${eligible.length} eligible movies to src/data/eligible-movies.json`);
  console.log(`Top 10:`);
  eligible.slice(0, 10).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.title} (score: ${m.score})`);
  });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
