const requests = new Map<string, { count: number; resetAt: number }>();
export const MAX_RATE_LIMIT_KEYS = 10000;

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
  { limit, windowMs, cost = 1 }: { limit: number; windowMs: number; cost?: number }
): { success: boolean; remaining: number } {
  const now = Date.now();
  if (!Number.isSafeInteger(cost) || cost < 1 || cost > limit || key.length > 512) {
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
