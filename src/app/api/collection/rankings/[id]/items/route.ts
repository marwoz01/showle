import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { isRecord, readJsonBody, RequestBodyError } from "@/lib/request-body";
import { MAX_RANKING_BODY_BYTES, MAX_RANKING_OPERATIONS, parseRankingMovies, parseRankingPositions, parseRankingMove } from "@/lib/ranking-input";
import { addRankingItems, reorderRankingItems, moveRankingItem, RankingWriteError } from "@/lib/ranking-items";

type Context = { params: Promise<{ id: string }> };
async function mutate(request: NextRequest, { params }: Context, reorder: boolean) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`collection-write:${userId}`, { limit: 30, windowMs: 60000 }).success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    const body = await readJsonBody(request, MAX_RANKING_BODY_BYTES);
    const { id } = await params;
    if (reorder && isRecord(body) && Object.hasOwn(body, "move")) {
      const move = parseRankingMove(body);
      if (!move) return NextResponse.json({ error: "invalid_items" }, { status: 400 });
      return NextResponse.json(await moveRankingItem(id, userId, move));
    }
    const movies = reorder ? null : parseRankingMovies(body);
    const positions = reorder ? parseRankingPositions(body) : null;
    const cost = movies?.length ?? positions?.length;
    if (!cost) return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    if (!rateLimit(`ranking-operations:${userId}`, { limit: MAX_RANKING_OPERATIONS, windowMs: 60000, cost }).success) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (positions) return NextResponse.json(await reorderRankingItems(id, userId, positions));
    const result = await addRankingItems(id, userId, movies!);
    return NextResponse.json(result, { status: result.added ? 201 : 200 });
  } catch (error) {
    if (error instanceof RequestBodyError || error instanceof RankingWriteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Ranking update failed:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
export const POST = (request: NextRequest, context: Context) => mutate(request, context, false);
export const PUT = (request: NextRequest, context: Context) => mutate(request, context, true);
