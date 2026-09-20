import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCollectionIds } from "@/lib/collection-input";
import { COLLECTION_HEADERS, collectionError, collectionLimit } from "@/lib/collection-api";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await collectionLimit(userId);
    if (limited) return limited;
    const ids = parseCollectionIds(request.nextUrl.searchParams);
    const items = await prisma.savedMovie.findMany({ where: { userId, tmdbId: { in: ids } }, select: { tmdbId: true, category: true } });
    return NextResponse.json({ items }, { headers: COLLECTION_HEADERS });
  } catch (error) { return collectionError(error); }
}
