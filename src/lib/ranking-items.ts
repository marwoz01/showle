import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MAX_RANKING_ITEMS, MAX_RANKING_OPERATIONS, type RankingMovieInput, type RankingPositionInput } from "@/lib/ranking-input";
import { rateLimit } from "@/lib/rate-limit";

export class RankingWriteError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 429, message: string) { super(message); }
}

export async function addRankingItems(listId: string, userId: string, movies: RankingMovieInput[]) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ranking:" + listId}))`;
    const list = await tx.rankedList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw new RankingWriteError(404, "not_found");
    const existing = await tx.rankedListItem.findMany({
      where: { listId }, select: { tmdbId: true, position: true }, orderBy: { position: "desc" },
    });
    const ids = new Set(existing.map((item) => item.tmdbId));
    const additions = movies.filter((movie) => !ids.has(movie.tmdbId));
    if (additions.length && existing.length + additions.length > MAX_RANKING_ITEMS) {
      throw new RankingWriteError(409, "ranking_limit");
    }
    let position = (existing[0]?.position ?? 0) + 1;
    if (additions.length && position + additions.length - 1 > 2147483647) {
      throw new RankingWriteError(409, "ranking_limit");
    }
    const created = [];
    for (const movie of additions) {
      created.push(await tx.rankedListItem.create({ data: { ...movie, listId, position: position++ } }));
    }
    return { added: created.length, skipped: movies.length - created.length, items: created };
  });
}

export async function reorderRankingItems(listId: string, userId: string, items: RankingPositionInput[]) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ranking:" + listId}))`;
    const list = await tx.rankedList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw new RankingWriteError(404, "not_found");
    const owned = await tx.rankedListItem.findMany({
      where: { listId, id: { in: items.map((item) => item.id) } }, select: { id: true },
    });
    if (owned.length !== items.length) throw new RankingWriteError(404, "not_found");
    // One bounded, parameterized write; scope the mutation as well as the preflight.
    await tx.$executeRaw(Prisma.sql`
      UPDATE "RankedListItem" AS item SET "position" = changes.position
      FROM (VALUES ${Prisma.join(items.map(({ id, position }) => Prisma.sql`(${id}, ${position}::integer)`))})
        AS changes(id, position)
      WHERE item.id = changes.id AND item."listId" = ${listId}
    `);
    return tx.rankedListItem.findMany({ where: { listId }, orderBy: { position: "asc" } });
  });
}

export async function moveRankingItem(listId: string, userId: string, move: RankingPositionInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ranking:" + listId}))`;
    const list = await tx.rankedList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw new RankingWriteError(404, "not_found");
    const [source] = await tx.$queryRaw<{ ordinal: number; total: number }[]>`
      SELECT ordinal, total FROM (
        SELECT id, (row_number() OVER (ORDER BY position, id))::integer AS ordinal,
          (count(*) OVER ())::integer AS total FROM "RankedListItem" WHERE "listId" = ${listId}
      ) AS ranked WHERE id = ${move.id}
    `;
    if (!source) throw new RankingWriteError(404, "not_found");
    if (move.position > source.total) throw new RankingWriteError(400, "invalid_items");
    // Legacy lists can exceed today's cap. One large move consumes the full budget,
    // but must not be split into independently committed chunks.
    const cost = Math.min(MAX_RANKING_OPERATIONS, Math.abs(source.ordinal - move.position) + 1);
    if (!rateLimit(`ranking-operations:${userId}`, { limit: MAX_RANKING_OPERATIONS, windowMs: 60000, cost }).success) {
      throw new RankingWriteError(429, "rate_limited");
    }
    const delta = source.ordinal < move.position ? -1 : 1;
    await tx.$executeRaw`
      WITH ordered AS (
        SELECT id, (row_number() OVER (ORDER BY position, id))::integer AS ordinal
        FROM "RankedListItem" WHERE "listId" = ${listId}
      ), reordered AS (
        SELECT id, CASE WHEN id = ${move.id} THEN ${move.position}::integer
          WHEN ordinal BETWEEN ${Math.min(source.ordinal, move.position)} AND ${Math.max(source.ordinal, move.position)}
            THEN ordinal + ${delta}::integer ELSE ordinal END AS position FROM ordered
      ) UPDATE "RankedListItem" AS item SET position = reordered.position FROM reordered
      WHERE item.id = reordered.id AND item."listId" = ${listId} AND item.position IS DISTINCT FROM reordered.position
    `;
    return tx.rankedListItem.findMany({ where: { listId }, orderBy: { position: "asc" } });
  });
}
