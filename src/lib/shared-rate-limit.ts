import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

export async function sharedRateLimit(key: string, { limit, windowMs, cost = 1 }: RateLimitOptions): Promise<RateLimitResult> {
  const hashedKey = createHash("sha256").update(key).digest("hex");
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
      VALUES (${hashedKey}, ${cost}::integer, CURRENT_TIMESTAMP + ${windowMs}::integer * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP
          THEN ${cost}::integer ELSE LEAST(${limit + 1}::integer, "RateLimitBucket"."count" + ${cost}::integer) END,
        "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP
          THEN CURRENT_TIMESTAMP + ${windowMs}::integer * INTERVAL '1 millisecond'
          ELSE "RateLimitBucket"."expiresAt" END
      RETURNING "count"
    `;
    const count = rows[0]?.count;
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid rate limit result");
    return { success: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    reportServerError("rate_limit.storage", error);
    return { success: false, remaining: 0, unavailable: true };
  }
}
