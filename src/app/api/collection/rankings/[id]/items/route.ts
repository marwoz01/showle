import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`collection-write:${userId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id: listId } = await params;

  const list = await prisma.rankedList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  // Support bulk add: { items: [...] } or single: { tmdbId, title, ... }
  const moviesToAdd = Array.isArray(body.items) ? body.items : [body];

  if (moviesToAdd.some((m: { tmdbId?: number; title?: string }) => !m.tmdbId || !m.title)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get existing items to skip duplicates and find next position
  const existing = await prisma.rankedListItem.findMany({
    where: { listId },
    select: { tmdbId: true, position: true },
    orderBy: { position: "desc" },
  });

  const existingTmdbIds = new Set(existing.map((e) => e.tmdbId));
  let nextPosition = (existing[0]?.position || 0) + 1;

  const newItems = moviesToAdd.filter(
    (m: { tmdbId: number }) => !existingTmdbIds.has(m.tmdbId)
  );

  if (newItems.length === 0) {
    return NextResponse.json({ added: 0, skipped: moviesToAdd.length }, { status: 200 });
  }

  const created = await prisma.$transaction(
    newItems.map((m: { tmdbId: number; title: string; year?: number; posterPath?: string; genres?: string[]; director?: string; overview?: string }) =>
      prisma.rankedListItem.create({
        data: {
          listId,
          tmdbId: m.tmdbId,
          title: m.title,
          year: m.year || 0,
          posterPath: m.posterPath || "",
          genres: m.genres || [],
          director: m.director || "",
          overview: m.overview || "",
          position: nextPosition++,
        },
      })
    )
  );

  return NextResponse.json(
    { added: created.length, skipped: moviesToAdd.length - created.length, items: created },
    { status: 201 }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`collection-write:${userId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id: listId } = await params;

  const list = await prisma.rankedList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Items must be an array" }, { status: 400 });
  }

  // Reorder all items in a transaction
  await prisma.$transaction(
    items.map((item: { id: string; position: number }) =>
      prisma.rankedListItem.update({
        where: { id: item.id },
        data: { position: item.position },
      })
    )
  );

  const updated = await prisma.rankedListItem.findMany({
    where: { listId },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(updated);
}
