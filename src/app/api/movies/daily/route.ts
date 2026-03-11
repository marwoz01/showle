import { NextResponse } from "next/server";
import { getDailyMovieFromTmdb } from "@/lib/tmdb";

export const revalidate = 3600; // revalidate every hour

export async function GET() {
  try {
    const movie = await getDailyMovieFromTmdb();

    if (!movie) {
      return NextResponse.json({ error: "No movie found" }, { status: 500 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("TMDB daily error:", error);
    return NextResponse.json({ error: "Failed to fetch daily movie" }, { status: 500 });
  }
}
