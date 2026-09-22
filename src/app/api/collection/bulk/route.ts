import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { addCollectionMovies, CollectionBulkError, parseCollectionBulkInput, undoCollectionMovies } from "@/lib/collection-bulk";
import { rateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

const headers = { "Cache-Control": "private, no-store" };

async function handle(request: NextRequest, undo: boolean) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const budget = rateLimit(`collection-write:${userId}`, { limit: 30, windowMs: 60_000 });
  if (!budget.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  try {
    const body = await readJsonBody(request, undo ? 64 * 1024 : 2 * 1024 * 1024);
    const result = undo
      ? await undoCollectionMovies(userId, body)
      : await addCollectionMovies(userId, parseCollectionBulkInput(body));
    return NextResponse.json(result, { status: undo ? 200 : 201, headers });
  } catch (error) {
    if (error instanceof CollectionBulkError || error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error && typeof error === "object" && "code" in error && (error.code === "P2034" || error.code === "P2002")) {
      return NextResponse.json({ error: "Collection changed. Try again." }, { status: 409, headers });
    }
    console.error("Collection bulk operation failed", error);
    return NextResponse.json({ error: "Could not update collection" }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  return handle(request, false);
}

export async function PATCH(request: NextRequest) {
  return handle(request, true);
}
