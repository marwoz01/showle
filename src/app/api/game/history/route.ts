import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`history:${userId}`, { limit: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get("perPage") || "20", 10)));
  const statusFilter = searchParams.get("status") || "all";

  const where: Record<string, unknown> = {
    userId,
    status: { not: "playing" },
  };

  if (statusFilter === "won" || statusFilter === "lost") {
    where.status = statusFilter;
  }

  const [items, total] = await Promise.all([
    prisma.gameResult.findMany({
      where,
      orderBy: { completedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        dateKey: true,
        mode: true,
        status: true,
        attemptCount: true,
        hintsUsed: true,
        targetMovieId: true,
        targetTitle: true,
        targetYear: true,
        targetPoster: true,
        completedAt: true,
      },
    }),
    prisma.gameResult.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}
