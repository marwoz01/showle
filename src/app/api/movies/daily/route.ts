import { NextResponse } from "next/server";
import { getDailyMovie } from "@/lib/daily";

export const revalidate = 60;

export async function GET() {
  try {
    const movie = await getDailyMovie();

    if (!movie) {
      return NextResponse.json({ error: "No movie found" }, { status: 500 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("Daily movie error:", error);
    return NextResponse.json({ error: "Failed to fetch daily movie" }, { status: 500 });
  }
}
