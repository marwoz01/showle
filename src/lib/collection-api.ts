import { NextResponse } from "next/server";
import { CollectionInputError } from "@/lib/collection-input";
import { RequestBodyError } from "@/lib/request-body";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/server-error";

export const COLLECTION_HEADERS = { "Cache-Control": "private, no-store" };
export async function collectionLimit(userId: string, write = false) {
  return (await checkRateLimit(`collection-${write ? "write" : "read"}:${userId}`, { limit: write ? 30 : 60, windowMs: 60000 })).success
    ? null : NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { ...COLLECTION_HEADERS, "Retry-After": "60" } });
}
export function collectionError(error: unknown) {
  if (error instanceof CollectionInputError || error instanceof RequestBodyError) {
    return NextResponse.json({ error: "invalid_request" }, { status: error instanceof RequestBodyError ? error.status : 400, headers: COLLECTION_HEADERS });
  }
  const errorId = reportServerError("collection.request", error);
  return NextResponse.json({ error: "collection_unavailable", errorId }, { status: 503, headers: COLLECTION_HEADERS });
}
