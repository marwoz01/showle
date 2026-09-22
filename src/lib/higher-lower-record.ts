import "server-only";
import { getHigherLowerCatalog } from "@/lib/higher-lower-catalog";
import { HIGHER_LOWER_MAX_TOKEN_LENGTH, HigherLowerError, validateHigherLowerRun } from "@/lib/higher-lower";
import { openHigherLowerRun } from "@/lib/higher-lower-session";
import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/request-body";

export function verifiedHigherLowerScore(input: unknown): number {
  if (!isRecord(input) || Object.keys(input).length !== 1 || typeof input.token !== "string"
    || !input.token.length || input.token.length > HIGHER_LOWER_MAX_TOKEN_LENGTH) {
    throw new HigherLowerError("invalid_request");
  }
  const { movies, version } = getHigherLowerCatalog();
  return validateHigherLowerRun(openHigherLowerRun(input.token), movies, version).score;
}

export async function getHigherLowerRecord(userId: string): Promise<number> {
  return (await prisma.higherLowerRecord.findUnique({ where: { userId }, select: { bestScore: true } }))?.bestScore ?? 0;
}

export async function saveHigherLowerRecord(userId: string, input: unknown): Promise<number> {
  const score = verifiedHigherLowerScore(input);
  // One atomic upsert prevents an older, slower request from lowering the record.
  const records = await prisma.$queryRaw<{ bestScore: number }[]>`
    INSERT INTO "HigherLowerRecord" ("userId", "bestScore", "updatedAt")
    VALUES (${userId}, ${score}, NOW())
    ON CONFLICT ("userId") DO UPDATE
    SET "bestScore" = GREATEST("HigherLowerRecord"."bestScore", EXCLUDED."bestScore"),
        "updatedAt" = CASE WHEN EXCLUDED."bestScore" > "HigherLowerRecord"."bestScore"
          THEN NOW() ELSE "HigherLowerRecord"."updatedAt" END
    RETURNING "bestScore"
  `;
  return records[0].bestScore;
}
