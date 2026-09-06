import { catalogClient, catalogMovie, discoverIds, pause, tmdb } from "./lib/recommend-catalog.mjs";

const args = process.argv.slice(2);
const limitFlag = args.find((arg) => arg.startsWith("--limit="));
const limit = limitFlag ? Number(limitFlag.split("=")[1]) : 5000;
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("--limit must be between 1 and 10000");
const client = catalogClient();

try {
  const existing = await client.recommendationMovie.findMany({ select: { tmdbId: true, updatedAt: true }, orderBy: { updatedAt: "asc" } });
  const discovered = args.includes("--refresh-only") ? [] : await discoverIds();
  const ids = [...new Set([...existing.map((movie) => movie.tmdbId), ...discovered])];
  const updated = new Map(existing.map((movie) => [movie.tmdbId, movie.updatedAt.getTime()]));
  const stale = ids.filter((id) => args.includes("--force") || !updated.has(id) || Date.now() - updated.get(id) > 6 * 86400_000).slice(0, limit);
  let cursor = 0;
  let imported = 0;
  let failed = 0;
  let skipped = 0;
  process.stdout.write(`Catalog: ${existing.length} stored, ${discovered.length} discovered, ${stale.length} to refresh.\n`);
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < stale.length) {
      const id = stale[cursor++];
      try {
        const raw = await tmdb(`/movie/${id}`, { language: "en-US", append_to_response: "credits,keywords,translations,watch/providers" });
        const movie = catalogMovie(raw);
        if (!movie) { skipped++; continue; }
        await client.recommendationMovie.upsert({ where: { tmdbId: id }, create: movie, update: movie });
        imported++;
      } catch { failed++; }
      if ((imported + failed + skipped) % 100 === 0) process.stdout.write(`Refreshed ${imported}; failed ${failed}; skipped ${skipped}.\n`);
      await pause(120);
    }
  }));
  const total = await client.recommendationMovie.count();
  const documentaries = await client.recommendationMovie.count({ where: { genres: { has: "Documentary" } } });
  process.stdout.write(JSON.stringify({ total, documentaries, imported, failed, skipped }) + "\n");
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[database]") : "Catalog sync failed");
  process.exitCode = 1;
} finally { await client.$disconnect(); }
