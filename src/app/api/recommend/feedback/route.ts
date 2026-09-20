import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { reportServerError } from "@/lib/server-error";
import { isRecord, readJsonBody, RequestBodyError } from "@/lib/request-body";
import { validMovieId } from "@/lib/recommend-input";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ip = requestIp(request);
  const budget = await checkRateLimit(`recommend-feedback:${ip}`, { limit: 120, windowMs: 60_000 });
  const personal = await checkRateLimit(`recommend-feedback-user:${userId}`, { limit: 30, windowMs: 60_000 });
  if (!budget.success || !personal.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: budget.unavailable || personal.unavailable ? 503 : 429,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
  try {
    const data = await readJsonBody(request, 1024);
    if (!isRecord(data) || !validMovieId(data.tmdbId) || !["more", "less", null].includes(data.reaction as string | null)) {
      return NextResponse.json({ error: "invalid_feedback" }, { status: 400 });
    }
    if (data.reaction === null) {
      await prisma.recommendationFeedback.deleteMany({ where: { userId, tmdbId: data.tmdbId } });
    } else {
      const movie = await prisma.recommendationMovie.findUnique({ where: { tmdbId: data.tmdbId }, select: { tmdbId: true } });
      if (!movie) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const reaction = data.reaction as "more" | "less";
      await prisma.recommendationFeedback.upsert({
        where: { userId_tmdbId: { userId, tmdbId: data.tmdbId } },
        create: { userId, tmdbId: data.tmdbId, reaction }, update: { reaction },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "invalid_feedback" }, { status: error.status });
    const requestId = reportServerError("recommendation_feedback", error);
    return NextResponse.json({ error: "internal", requestId }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
