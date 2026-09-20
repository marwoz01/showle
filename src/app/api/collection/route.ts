import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request-body";
import { MAX_COLLECTION_BODY_BYTES, parseCollectionCreate, parseCollectionQuery } from "@/lib/collection-input";
import { COLLECTION_HEADERS, collectionError, collectionLimit } from "@/lib/collection-api";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await collectionLimit(userId);
    if (limited) return limited;
    const { category, sort, order, page } = parseCollectionQuery(request.nextUrl.searchParams);
    const field = { date: "createdAt", rating: "rating", title: "title", year: "year" }[sort];
    const where = { userId, category };
    const [items, total] = await Promise.all([
      prisma.savedMovie.findMany({ where, orderBy: [{ [field]: order }, { id: order }], skip: (page - 1) * 20, take: 20 }),
      prisma.savedMovie.count({ where }),
    ]);
    return NextResponse.json({ items, total }, { headers: COLLECTION_HEADERS });
  } catch (error) { return collectionError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await collectionLimit(userId, true);
    if (limited) return limited;
    const input = parseCollectionCreate(await readJsonBody(request, MAX_COLLECTION_BODY_BYTES));
    const movie = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collection:${userId}`}))`;
      const where = { userId_tmdbId: { userId, tmdbId: input.tmdbId } };
      const existing = await tx.savedMovie.findUnique({ where });
      return tx.savedMovie.upsert({ where,
        update: { category: input.category, rating: input.rating, review: input.review,
          watchedAt: input.category === "watched" ? existing?.watchedAt ?? new Date() : null },
        create: { userId, ...input, watchedAt: input.category === "watched" ? new Date() : null },
      });
    });
    return NextResponse.json(movie, { status: 201, headers: COLLECTION_HEADERS });
  } catch (error) { return collectionError(error); }
}
