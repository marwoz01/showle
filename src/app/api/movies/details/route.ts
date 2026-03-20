import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = rateLimit(`details:${ip}`, { limit: 60, windowMs: 60_000 });

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const id = request.nextUrl.searchParams.get("id");

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    const movie = await getMovieDetails(Number(id));

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("TMDB details error:", error);
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
