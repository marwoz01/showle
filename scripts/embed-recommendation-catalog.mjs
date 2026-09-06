import { catalogClient, embeddingHash, embeddingText, pause } from "./lib/recommend-catalog.mjs";

const flag = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = flag ? Number(flag.split("=")[1]) : 300;
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("Invalid embedding limit");
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");
const client = catalogClient();
try {
  const rows = await client.$queryRawUnsafe(`SELECT "tmdbId", title, year, genres, director, keywords, overview, "embeddingTextHash"
    FROM "RecommendationMovie" ORDER BY (embedding IS NULL) DESC, "updatedAt" ASC, "tmdbId" ASC`);
  const pending = rows.map((movie) => ({ movie, text: embeddingText(movie) }))
    .filter(({ movie, text }) => movie.embeddingTextHash !== embeddingHash(text)).slice(0, limit);
  let done = 0;
  for (let offset = 0; offset < pending.length; offset += 20) {
    const batch = pending.slice(offset, offset + 20);
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents", {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ requests: batch.map(({ text }) => ({ model: "models/gemini-embedding-001", content: { parts: [{ text }] }, outputDimensionality: 1536 })) }),
    });
    if (!response.ok) throw new Error(`Embedding HTTP ${response.status}; checkpoint retained, rerun later.`);
    const data = await response.json();
    if (data.embeddings?.length !== batch.length) throw new Error("Invalid embedding batch");
    for (let i = 0; i < batch.length; i++) {
      const values = data.embeddings[i]?.values;
      if (!Array.isArray(values) || values.length !== 1536 || !values.every(Number.isFinite) || !values.some((value) => value !== 0)) throw new Error("Invalid vector");
      await client.$executeRawUnsafe('UPDATE "RecommendationMovie" SET embedding = $1::vector, "embeddingTextHash" = $2 WHERE "tmdbId" = $3',
        `[${values.join(",")}]`, embeddingHash(batch[i].text), batch[i].movie.tmdbId);
      done++;
    }
    process.stdout.write(`Embedded ${done}/${pending.length}.\n`);
    if (offset + 20 < pending.length) await pause(13000);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[database]") : "Embedding refresh failed");
  process.exitCode = 1;
} finally { await client.$disconnect(); }
