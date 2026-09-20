import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COLLECTION_HEADERS, collectionError, collectionLimit } from "@/lib/collection-api";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await collectionLimit(userId);
    if (limited) return limited;
    const [watched, watchlist, rankings] = await Promise.all([
      prisma.savedMovie.count({ where: { userId, category: "watched" } }),
      prisma.savedMovie.count({ where: { userId, category: "watchlist" } }),
      prisma.rankedList.count({ where: { userId } }),
    ]);
    return NextResponse.json({ watched, watchlist, rankings }, { headers: COLLECTION_HEADERS });
  } catch (error) { return collectionError(error); }
}
