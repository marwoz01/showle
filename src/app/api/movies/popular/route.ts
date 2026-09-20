import { NextRequest, NextResponse } from "next/server";
import { getPopularMovies } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = rateLimit(`popular:${ip}`, { limit: 30, windowMs: 60_000 });

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);

  try {
    const data = await getPopularMovies(page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("TMDB popular error:", error);
    return NextResponse.json({ results: [], totalPages: 0 }, { status: 500 });
  }
}
