import { reportServerError } from "@/lib/server-error";
import { requestIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";
import { getWatchProviders } from "@/lib/tmdb";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = requestIp(request);
  const { success } = (await checkRateLimit(`watch-providers:${ip}`, { limit: 60, windowMs: 60_000 }));
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    const data = await getWatchProviders(Number(id));
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    reportServerError("movies.watch-providers", error);
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}
