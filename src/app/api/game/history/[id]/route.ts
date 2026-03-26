import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getMovieDetails } from "@/lib/tmdb";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`history-detail:${userId}`, { limit: 20, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;

  const game = await prisma.gameResult.findUnique({ where: { id } });

  if (!game || game.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch full movie details for the target and each guess
  const [targetMovie, ...guessMovies] = await Promise.all([
    getMovieDetails(game.targetMovieId),
    ...game.guessIds.map((tmdbId) => getMovieDetails(tmdbId)),
  ]);

  return NextResponse.json({
    game: {
      id: game.id,
      dateKey: game.dateKey,
      mode: game.mode,
      status: game.status,
      attemptCount: game.attemptCount,
      hintsUsed: game.hintsUsed,
      targetMovieId: game.targetMovieId,
      targetTitle: game.targetTitle,
      targetYear: game.targetYear,
      targetPoster: game.targetPoster,
      completedAt: game.completedAt,
    },
    targetMovie,
    guessMovies,
  });
}
