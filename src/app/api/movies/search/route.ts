import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = rateLimit(`search:${ip}`, { limit: 30, windowMs: 60_000 });

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchMovies(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error("TMDB search error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
