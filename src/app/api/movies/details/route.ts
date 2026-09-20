import { reportServerError } from "@/lib/server-error";
import { requestIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = requestIp(request);
  const { success } = (await checkRateLimit(`details:${ip}`, { limit: 60, windowMs: 60_000 }));

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
    const lang = request.nextUrl.searchParams.get("lang");
    const language = lang === "pl" ? "pl-PL" : "en-US";
    const movie = await getMovieDetails(Number(id), language);

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    reportServerError("movies.details", error);
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
