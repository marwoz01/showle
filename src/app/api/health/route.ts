import { NextResponse } from "next/server";
import { isOpsRequest } from "@/lib/ops-auth";
import { reportServerError } from "@/lib/server-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!isOpsRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  const configuration = {
    database: Boolean(process.env.DATABASE_URL),
    movies: Boolean(process.env.TMDB_API_KEY),
    auth: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    recommendations: Boolean(process.env.OPENROUTER_API_KEY && process.env.GEMINI_API_KEY),
    monitoring: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    trustedProxy: process.env.VERCEL === "1" || ["vercel", "forwarded"].includes(process.env.TRUSTED_PROXY ?? ""),
  };
  try {
    const { prisma } = await import("@/lib/prisma");
    const [schema] = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`;
      return tx.$queryRaw<{ limiter: boolean; games: boolean; recommendations: boolean; preferences: boolean; deletionQueue: boolean; vector: boolean }[]>`
        SELECT to_regclass('"RateLimitBucket"') IS NOT NULL AS limiter,
          to_regclass('"DailyMovieSnapshot"') IS NOT NULL AND to_regclass('"DuelRoom"') IS NOT NULL AS games,
          to_regclass('"RecommendationMovie"') IS NOT NULL AS recommendations,
          to_regclass('"RecommendationSettings"') IS NOT NULL AS preferences,
          to_regclass('"AccountDeletionTask"') IS NOT NULL AS "deletionQueue",
          EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector
      `;
    }, { maxWait: 2000, timeout: 5000 });
    const ok = Boolean(configuration.database && configuration.movies && configuration.auth && configuration.trustedProxy
      && schema?.limiter && schema.games && schema.recommendations && schema.preferences && schema.deletionQueue && schema.vector);
    return NextResponse.json({ status: ok ? "ok" : "degraded", database: "reachable", schema, configuration }, { status: ok ? 200 : 503, headers });
  } catch (error) {
    const errorId = reportServerError("ops.health", error);
    return NextResponse.json({ status: "unavailable", database: "unavailable", configuration, errorId }, { status: 503, headers });
  }
}
