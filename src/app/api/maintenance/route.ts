import { NextResponse } from "next/server";
import { isOpsRequest } from "@/lib/ops-auth";
import { reportServerError } from "@/lib/server-error";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!isOpsRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  try {
    const { prisma } = await import("@/lib/prisma");
    const deleted = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`;
      const rooms = await tx.$executeRaw`
        DELETE FROM "DuelRoom" WHERE code IN (
          SELECT code FROM "DuelRoom" WHERE "expiresAt" < CURRENT_TIMESTAMP - INTERVAL '1 day'
          ORDER BY "expiresAt" LIMIT 1000 FOR UPDATE SKIP LOCKED
        )
      `;
      const usage = await tx.$executeRaw`
        DELETE FROM "DailyUsage" WHERE key IN (
          SELECT key FROM "DailyUsage" WHERE date < to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - INTERVAL '30 days', 'YYYY-MM-DD')
          ORDER BY date LIMIT 1000 FOR UPDATE SKIP LOCKED
        )
      `;
      const limits = await tx.$executeRaw`
        DELETE FROM "RateLimitBucket" WHERE key IN (
          SELECT key FROM "RateLimitBucket" WHERE "expiresAt" < CURRENT_TIMESTAMP - INTERVAL '1 day'
          ORDER BY "expiresAt" LIMIT 1000 FOR UPDATE SKIP LOCKED
        )
      `;
      return { rooms, usage, limits };
    }, { maxWait: 2000, timeout: 12000 });
    const { processAccountDeletionTasks } = await import("@/lib/account-data");
    const accountDeletions = await processAccountDeletionTasks();
    return NextResponse.json({ deleted, accountDeletions, moreMayRemain: accountDeletions === 10 || Object.values(deleted).some((count) => count === 1000) }, { headers });
  } catch (error) {
    const errorId = reportServerError("ops.maintenance", error);
    return NextResponse.json({ error: "maintenance_unavailable", errorId }, { status: 503, headers });
  }
}
