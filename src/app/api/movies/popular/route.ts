import { reportServerError } from "@/lib/server-error";
import { requestIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";
import { getPopularMovies } from "@/lib/tmdb";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = requestIp(request);
  const { success } = (await checkRateLimit(`popular:${ip}`, { limit: 30, windowMs: 60_000 }));

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  if (!Number.isInteger(page) || page < 1 || page > 20) {
    return NextResponse.json({ error: "invalid_page" }, { status: 400 });
  }

  try {
    const data = await getPopularMovies(page);
    return NextResponse.json(data);
  } catch (error) {
    reportServerError("movies.popular", error);
    return NextResponse.json({ results: [], totalPages: 0 }, { status: 500 });
  }
}
