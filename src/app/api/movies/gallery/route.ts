import { reportServerError } from "@/lib/server-error";
import { requestIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";
import { getMovieGallery } from "@/lib/tmdb";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = requestIp(request);
  const { success } = (await checkRateLimit(`gallery:${ip}`, { limit: 60, windowMs: 60_000 }));
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    const backdrops = await getMovieGallery(Number(id));
    return NextResponse.json(
      { backdrops },
      {
        headers: {
          // Stills change rarely — cache aggressively.
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      },
    );
  } catch (error) {
    reportServerError("movies.gallery", error);
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}
