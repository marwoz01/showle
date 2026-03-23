import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: listId, itemId } = await params;

  const list = await prisma.rankedList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.rankedListItem.findUnique({ where: { id: itemId } });
  if (!item || item.listId !== listId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.rankedListItem.delete({ where: { id: itemId } }),
    // Shift positions down for items after the deleted one
    prisma.rankedListItem.updateMany({
      where: { listId, position: { gt: item.position } },
      data: { position: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true });
}
