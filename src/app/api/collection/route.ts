import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`collection-read:${userId}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "watched";
  const sort = searchParams.get("sort") || "date";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const perPage = 20;

  const orderBy =
    sort === "rating"
      ? { rating: "desc" as const }
      : sort === "title"
        ? { title: "asc" as const }
        : sort === "year"
          ? { year: "desc" as const }
          : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.savedMovie.findMany({
      where: { userId, category },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.savedMovie.count({ where: { userId, category } }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`collection-write:${userId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const { tmdbId, title, year, posterPath, genres, director, overview, runtime, tmdbRating, category, rating, review } =
    body;

  if (!tmdbId || !title || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["watched", "watchlist"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (rating !== undefined && rating !== null && (rating < 0.5 || rating > 10)) {
    return NextResponse.json({ error: "Rating must be 0.5-10" }, { status: 400 });
  }

  const movie = await prisma.savedMovie.upsert({
    where: { userId_tmdbId: { userId, tmdbId } },
    update: { category, rating, review },
    create: {
      userId,
      tmdbId,
      title,
      year: year || 0,
      posterPath: posterPath || "",
      genres: genres || [],
      director: director || "",
      overview: overview || "",
      runtime: runtime || 0,
      tmdbRating: tmdbRating || 0,
      category,
      rating: rating || null,
      review: review || null,
      watchedAt: category === "watched" ? new Date() : null,
    },
  });

  return NextResponse.json(movie, { status: 201 });
}
