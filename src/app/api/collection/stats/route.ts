import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const movies = await prisma.savedMovie.findMany({
    where: { userId, category: "watched" },
    select: { runtime: true, genres: true },
  });

  const totalMovies = movies.length;
  const totalMinutes = movies.reduce((sum, m) => sum + (m.runtime || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);

  const genreCounts: Record<string, number> = {};
  for (const m of movies) {
    for (const g of m.genres) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }
  const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return NextResponse.json({ totalMovies, totalHours, totalMinutes, favoriteGenre });
}
