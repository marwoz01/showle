import { catalogClient } from "./lib/recommend-catalog.mjs";

const model = process.env.RECOMMENDATION_CHAT_MODEL || "google/gemini-2.5-flash-lite";
try {
  const response = await fetch(`https://openrouter.ai/api/v1/models/${model.split("/").map(encodeURIComponent).join("/")}/endpoints`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Model registry HTTP ${response.status}`);
  const data = await response.json();
  const endpoints = data.data?.endpoints ?? [];
  if (!endpoints.length) throw new Error(`No active endpoints for ${model}`);
  process.stdout.write(JSON.stringify({ chatModel: model, activeEndpoints: endpoints.length }) + "\n");
  if (process.env.DATABASE_URL) {
    const client = catalogClient();
    try {
      const [coverage] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int AS total,
        COUNT(embedding)::int AS embedded,
        COUNT(*) FILTER (WHERE "embeddingTextHash" != '')::int AS "refreshedVectors",
        COUNT(*) FILTER (WHERE 'Documentary' = ANY(genres))::int AS documentaries,
        COUNT(*) FILTER (WHERE cardinality("providerIds") > 0)::int AS "withPolishSubscriptions",
        COUNT(*) FILTER (WHERE "providersUpdatedAt" < NOW() - INTERVAL '8 days' OR "providersUpdatedAt" IS NULL)::int AS "staleProviders"
        FROM "RecommendationMovie"`);
      process.stdout.write(JSON.stringify(coverage) + "\n");
      if (!coverage.total || coverage.embedded < coverage.total || coverage.staleProviders > 0) process.exitCode = 1;
    } finally { await client.$disconnect(); }
  }
} catch {
  console.error("Recommendation health check failed. Check provider availability and catalog migration.");
  process.exitCode = 1;
}
