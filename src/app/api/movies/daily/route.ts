import { NextRequest, NextResponse } from "next/server";
import { getDailyMovie } from "@/lib/daily";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Accept optional dateKey from client to ensure cache-busting at midnight
    const dateKey = request.nextUrl.searchParams.get("dateKey");
    const movie = await getDailyMovie(dateKey || undefined);

    if (!movie) {
      return NextResponse.json({ error: "No movie found" }, { status: 500 });
    }

    // Cache for 5 minutes on CDN, but allow revalidation
    return NextResponse.json(movie, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Daily movie error:", error);
    return NextResponse.json({ error: "Failed to fetch daily movie" }, { status: 500 });
  }
}
