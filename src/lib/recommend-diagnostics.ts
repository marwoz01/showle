type RecommendationStage = "interpretation" | "embedding" | "relevance";
const reported = new Map<string, number>();

/** Log operational causes without user descriptions, provider bodies, URLs or credentials. */
export function reportRecommendationFallback(stage: RecommendationStage, error: unknown) {
  const status = error && typeof error === "object" && "status" in error &&
    typeof error.status === "number" && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status : undefined;
  const name = error instanceof Error ? error.name : "";
  const reason = !process.env[stage === "embedding" ? "GEMINI_API_KEY" : "OPENROUTER_API_KEY"] ? "missing_configuration"
    : status === 401 || status === 403 ? "authentication"
    : status === 402 ? "credits_exhausted"
    : status === 429 || (error instanceof Error && error.message === "embedding_cooldown") ? "rate_limited"
    : ["TimeoutError", "AbortError", "APIConnectionTimeoutError"].includes(name) ? "timeout"
    : name === "SyntaxError" ? "invalid_response" : "unavailable";
  const key = `${stage}:${reason}:${status ?? ""}`;
  const now = Date.now();
  if (now - (reported.get(key) ?? -Infinity) < 60000) return;
  reported.set(key, now);
  console.warn(JSON.stringify({ event: "recommendation_fallback", stage, reason, ...(status ? { status } : {}) }));
}
