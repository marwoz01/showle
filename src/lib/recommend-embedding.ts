const cache = new Map<string, { vector: number[]; expires: number }>();
let unavailableUntil = 0;

export async function getEmbedding(text: string): Promise<number[]> {
  const key = text.slice(0, 2000);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.vector;
  if (Date.now() < unavailableUntil) throw new Error("embedding_cooldown");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent", {
    method: "POST", signal: AbortSignal.timeout(6000),
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({ content: { parts: [{ text: key }] }, outputDimensionality: 1536 }),
  });
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      const retrySeconds = Number(response.headers.get("Retry-After"));
      unavailableUntil = Date.now() + Math.min(3600, Math.max(60, retrySeconds || 60)) * 1000;
    }
    throw new Error(`embedding_${response.status}`);
  }
  const data = await response.json();
  const vector: unknown = data?.embedding?.values;
  if (!Array.isArray(vector) || vector.length !== 1536 ||
    !vector.every((value) => typeof value === "number" && Number.isFinite(value)) ||
    !vector.some((value) => value !== 0)) throw new Error("invalid_embedding");
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, { vector, expires: Date.now() + 86400_000 });
  return vector;
}
