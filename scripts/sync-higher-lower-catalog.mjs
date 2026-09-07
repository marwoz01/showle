/**
 * Offline TMDB snapshot for the runtime comparison game.
 *
 * node scripts/sync-higher-lower-catalog.mjs --limit=350
 * node scripts/sync-higher-lower-catalog.mjs --ids=157336,27205 --refresh
 *
 * Imports the highest-ranked eligible films first, preserving existing entries.
 * Gameplay reads the checked-in catalog and never needs a TMDB API key.
 */
import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const key = process.env.TMDB_API_KEY;
if (!key) throw new Error("Missing TMDB_API_KEY");

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const idsArg = args.find((arg) => arg.startsWith("--ids="));
const limit = limitArg ? Number(limitArg.slice(8)) : 350;
const refresh = args.includes("--refresh");
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2000) {
  throw new Error("Use --limit=1 through --limit=2000");
}
if (args.some((arg) => !/^(--limit=|--ids=|--refresh$)/.test(arg))) {
  throw new Error("Supported options: --limit=350, --ids=123,456, --refresh");
}

const path = resolve("src/data/higher-lower-catalog.json");
const today = new Date().toISOString().slice(0, 10);
const seeds = JSON.parse(
  await readFile(resolve("src/data/eligible-movies.json"), "utf8"),
);
const frameCatalog = JSON.parse(
  await readFile(resolve("src/data/frame-catalog.json"), "utf8"),
);
const frames = new Map(frameCatalog.movies.map((movie) => [movie.id, movie]));
let catalog = { version: 1, source: "TMDB", updatedAt: today, movies: [] };
try {
  catalog = JSON.parse(await readFile(path, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (catalog.version !== 1 || catalog.source !== "TMDB" || !Array.isArray(catalog.movies)) {
  throw new Error("Unsupported higher/lower catalog format");
}

const ids = [...new Set(
  idsArg
    ? idsArg.slice(6).split(",").map(Number)
    : [...seeds]
        .sort((a, b) => b.score - a.score || a.id - b.id)
        .map((movie) => movie.id),
)];
if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
  throw new Error("Use positive TMDB IDs in --ids=123,456");
}

const movies = new Map(catalog.movies.map((movie) => [movie.id, movie]));
const queue = ids.slice(0, limit).filter((id) => refresh || !movies.has(id));
const requestCount = queue.length;
const failures = [];
let imported = 0;
let skipped = 0;
let completed = 0;
let authenticationFailed = false;
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchMovie(id) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
  url.search = new URLSearchParams({
    api_key: key,
    language: "en-US",
    append_to_response: "translations",
  }).toString();

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (response.status === 404) return null;
      if (response.status === 401 || response.status === 403) {
        authenticationFailed = true;
        throw new Error("TMDB authentication failed");
      }
      if (!response.ok) throw new Error(`TMDB returned HTTP ${response.status}`);
      return await response.json();
    } catch {
      // Request errors can contain credentials in URLs; never log them.
      if (authenticationFailed || attempt === 3) {
        throw new Error("TMDB request failed");
      }
      await pause(1000 * 2 ** attempt);
    }
  }
}

function toEntry(movie, expectedId) {
  if (
    !movie ||
    movie.id !== expectedId ||
    movie.adult !== false ||
    movie.status !== "Released" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(movie.release_date ?? "") ||
    movie.release_date > today ||
    !Number.isInteger(movie.runtime) ||
    movie.runtime < 40 ||
    movie.runtime > 240 ||
    !Number.isInteger(movie.vote_count) ||
    movie.vote_count < 500
  ) return null;

  // Exclude documentaries and TV specials from the feature-film pool.
  if (!Array.isArray(movie.genres) || !movie.genres.length ||
      movie.genres.some((genre) => [99, 10770].includes(genre.id))) return null;

  const existing = frames.get(movie.id);
  const backdropPath = existing?.frames?.[0] || movie.backdrop_path;
  if (typeof backdropPath !== "string" || !/^\/[A-Za-z0-9]+\.(jpg|png)$/.test(backdropPath)) {
    return null;
  }
  const polish = movie.translations?.translations?.find(
    (translation) => translation.iso_639_1 === "pl",
  )?.data?.title;
  const english = existing?.titles?.en || movie.title || movie.original_title;
  if (!english?.trim()) return null;

  return {
    id: movie.id,
    titles: {
      pl: (existing?.titles?.pl || polish || english).trim(),
      en: english.trim(),
    },
    year: Number(movie.release_date.slice(0, 4)),
    runtime: movie.runtime,
    backdropPath,
    voteCount: movie.vote_count,
  };
}

console.log(`Higher/lower catalog: checking ${requestCount} films.`);
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length && !authenticationFailed) {
    const id = queue.shift();
    try {
      const entry = toEntry(await fetchMovie(id), id);
      if (entry) {
        movies.set(id, entry);
        imported++;
      } else {
        skipped++;
      }
    } catch {
      failures.push(id);
      console.error(`Could not import TMDB film ${id}; existing entry kept.`);
    }
    completed++;
    if (completed % 50 === 0) {
      console.log(`Processed ${completed}/${requestCount}; imported ${imported}.`);
    }
    await pause(150);
  }
}));

if (imported) {
  const rows = [...movies.values()].sort((a, b) => a.id - b.id);
  const output = `{"version":1,"source":"TMDB","updatedAt":"${today}","movies":[\n${rows.map((movie) => JSON.stringify(movie)).join(",\n")}\n]}\n`;
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    // Atomic replacement of generated data; never truncate the existing catalog.
    await writeFile(temporaryPath, output, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

console.log(`Catalog: ${movies.size} films. Imported: ${imported}; skipped: ${skipped}; failed: ${failures.length}.`);
if (authenticationFailed) {
  console.error("TMDB authentication failed; verify TMDB_API_KEY before retrying.");
  process.exitCode = 1;
} else if (failures.length) {
  console.error(`Retry failed films with --ids=${failures.join(",")} --refresh`);
  process.exitCode = 1;
}
