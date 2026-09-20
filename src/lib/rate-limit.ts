const requests = new Map<string, { count: number; resetAt: number }>();
export const MAX_RATE_LIMIT_KEYS = 10000;
export interface RateLimitOptions { limit: number; windowMs: number; cost?: number }
export interface RateLimitResult { success: boolean; remaining: number; unavailable?: true }

function validOptions(key: string, { limit, windowMs, cost = 1 }: RateLimitOptions) {
  return key.length > 0 && key.length <= 512 && Number.isSafeInteger(limit) && limit > 0 && limit <= 10000000
    && Number.isSafeInteger(windowMs) && windowMs > 0 && windowMs <= 86400000
    && Number.isSafeInteger(cost) && cost > 0 && cost <= limit;
}

export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  if (!validOptions(key, options)) return { success: false, remaining: 0 };
  if (process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT_BACKEND !== "postgres") {
    return rateLimit(key, options);
  }
  try {
    const { sharedRateLimit } = await import("@/lib/shared-rate-limit");
    return await sharedRateLimit(key, options);
  } catch {
    // An unavailable DB configuration must never silently select process-local quotas.
    return { success: false, remaining: 0, unavailable: true };
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requests) {
    if (now > value.resetAt) {
      requests.delete(key);
    }
  }
}, 60_000);

/**
 * Simple in-memory rate limiter.
 * Returns { success: true } if under limit, { success: false } if exceeded.
 */
export function rateLimit(
  key: string,
  { limit, windowMs, cost = 1 }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  if (!validOptions(key, { limit, windowMs, cost })) {
    return { success: false, remaining: 0 };
  }
  const entry = requests.get(key);

  if (!entry || now > entry.resetAt) {
    // Do not evict live budgets: rotating keys must not reset existing limits.
    if (!entry && requests.size >= MAX_RATE_LIMIT_KEYS) return { success: false, remaining: 0 };
    requests.set(key, { count: cost, resetAt: now + windowMs });
    return { success: true, remaining: limit - cost };
  }

  entry.count = Math.min(limit + 1, entry.count + cost);

  if (entry.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - entry.count };
}
