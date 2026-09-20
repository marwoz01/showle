import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request-body";
import { MAX_COLLECTION_BODY_BYTES, parseCollectionPatch } from "@/lib/collection-input";
import { COLLECTION_HEADERS, collectionError, collectionLimit } from "@/lib/collection-api";

interface RouteContext { params: Promise<{ id: string }> }
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await collectionLimit(userId, true);
    if (limited) return limited;
    const { id } = await params;
    const data = parseCollectionPatch(await readJsonBody(request, MAX_COLLECTION_BODY_BYTES));
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collection:${userId}`}))`;
      const existing = await tx.savedMovie.findFirst({ where: { id, userId } });
      if (!existing) return null;
      if (data.category === "watchlist") data.watchedAt = null;
      else if (data.category === "watched" && data.watchedAt === undefined) data.watchedAt = existing.watchedAt ?? new Date();
      return tx.savedMovie.update({ where: { id, userId }, data });
    });
    return updated ? NextResponse.json(updated, { headers: COLLECTION_HEADERS })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return collectionError(error); }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await collectionLimit(userId, true);
    if (limited) return limited;
    const { id } = await params;
    const result = await prisma.savedMovie.deleteMany({ where: { id, userId } });
    return result.count ? NextResponse.json({ success: true }, { headers: COLLECTION_HEADERS })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return collectionError(error); }
}
