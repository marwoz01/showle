/** Offline, additive importer. Normal gameplay never calls TMDB to build questions. */
import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const key = process.env.TMDB_API_KEY;
if (!key) throw new Error("Missing TMDB_API_KEY");
const args = process.argv.slice(2);
const idsArg = args.find((arg) => arg.startsWith("--ids="));
const refresh = args.includes("--refresh");
const path = resolve("src/data/frame-catalog.json");
const catalog = JSON.parse(await readFile(path, "utf8"));
const seeds = JSON.parse(
  await readFile(resolve("src/data/eligible-movies.json"), "utf8"),
);
const ids = [
  ...new Set(
    idsArg
      ? idsArg.slice(6).split(",").map(Number)
      : seeds.map((movie) => movie.id),
  ),
];
if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0))
  throw new Error("Use positive TMDB IDs in --ids=123,456");
const movies = new Map(catalog.movies.map((movie) => [movie.id, movie]));
const queue = ids.filter((id) => refresh || !movies.has(id));
const failures = [];
let completed = 0;
let imported = 0;
let skipped = 0;
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchMovie(id) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
  url.search = new URLSearchParams({
    api_key: key,
    language: "en-US",
    append_to_response: "credits,keywords,images,translations",
    include_image_language: "null",
  }).toString();
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      // Never log a request URL: it contains the API key.
      if (attempt === 3) throw new Error("TMDB request failed after retries");
      await pause(1500 * 2 ** attempt);
    }
  }
}

function toEntry(movie) {
  if (
    !movie ||
    movie.adult ||
    movie.status !== "Released" ||
    movie.release_date > new Date().toISOString().slice(0, 10)
  )
    return null;
  const year = Number(movie.release_date?.slice(0, 4));
  const genreIds = movie.genres.map((genre) => genre.id);
  // Documentary/TV specials make unreliable fictional-film distractors.
  if (
    !year ||
    !genreIds.length ||
    genreIds.some((id) => [99, 10770].includes(id))
  )
    return null;
  const frames = [
    ...new Set(
      (movie.images?.backdrops ?? [])
        .filter(
          (frame) =>
            frame.iso_639_1 === null &&
            frame.width >= 1280 &&
            frame.aspect_ratio >= 1.5 &&
            frame.aspect_ratio <= 2.5,
        )
        .sort(
          (a, b) =>
            b.vote_average - a.vote_average || b.vote_count - a.vote_count,
        )
        .slice(0, 3)
        .map((frame) => frame.file_path),
    ),
  ];
  if (!frames.length) return null;
  const polish = movie.translations?.translations?.find(
    (translation) => translation.iso_639_1 === "pl",
  )?.data?.title;
  return {
    id: movie.id,
    titles: {
      en: movie.title || movie.original_title,
      pl: polish || movie.title || movie.original_title,
    },
    year,
    genreIds,
    keywordIds: (movie.keywords?.keywords ?? []).map((keyword) => keyword.id),
    castIds: (movie.credits?.cast ?? []).slice(0, 8).map((person) => person.id),
    directorIds: (movie.credits?.crew ?? [])
      .filter((person) => person.job === "Director")
      .map((person) => person.id),
    language: movie.original_language,
    collectionId: movie.belongs_to_collection?.id ?? null,
    frames,
  };
}

await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        const entry = toEntry(await fetchMovie(id));
        if (entry) {
          movies.set(id, entry);
          imported++;
        } else {
          skipped++;
          console.log(
            `Skipped ${id}: not released/eligible or no textless landscape image`,
          );
        }
      } catch {
        failures.push(id);
        console.error(`Could not import TMDB movie ${id}; existing entry kept`);
      }
      completed++;
      if (completed % 50 === 0)
        console.log(
          `Processed ${completed}/${ids.length}; imported ${imported}`,
        );
      await pause(150);
    }
  }),
);

if (imported) {
  // Generated data only; replace atomically, retaining every existing ID on failure.
  const rows = [...movies.values()].sort((a, b) => a.id - b.id);
  const output = `{"version":1,"source":"TMDB","updatedAt":"${new Date().toISOString().slice(0, 10)}","movies":[\n${rows.map((movie) => JSON.stringify(movie)).join(",\n")}\n]}\n`;
  await writeFile(`${path}.tmp`, output, "utf8");
  await rename(`${path}.tmp`, path);
}
console.log(
  `Catalog: ${movies.size} movies. Imported: ${imported}; skipped: ${skipped}; failed: ${failures.length}.`,
);
if (failures.length) {
  console.error(`Retry with --ids=${failures.join(",")}`);
  process.exitCode = 1;
}
