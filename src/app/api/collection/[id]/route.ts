import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(
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

  const { id } = await params;

  const existing = await prisma.savedMovie.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.category !== undefined) {
    if (!["watched", "watchlist"].includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = body.category;
    if (body.category === "watched" && !existing.watchedAt) {
      data.watchedAt = new Date();
    }
  }

  if (body.rating !== undefined) {
    if (body.rating !== null && (body.rating < 0.5 || body.rating > 10)) {
      return NextResponse.json({ error: "Rating must be 0.5-10" }, { status: 400 });
    }
    data.rating = body.rating;
  }

  if (body.review !== undefined) {
    data.review = body.review;
  }

  if (body.watchedAt !== undefined) {
    data.watchedAt = body.watchedAt ? new Date(body.watchedAt) : null;
  }

  const updated = await prisma.savedMovie.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.savedMovie.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savedMovie.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
