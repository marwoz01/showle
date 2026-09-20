import { requestIp } from "@/lib/request-ip";
import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/game-date";
import {
  applyDailyAction,
  getDailyGameView,
  parseDailyAction,
} from "@/lib/daily-game";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/server-error";

export async function dailyResponse(request: NextRequest, mutate = false) {
  const dateKey = getTodayKey();
  const requestedDate = request.nextUrl.searchParams.get("dateKey");
  if (requestedDate && requestedDate !== dateKey) {
    return NextResponse.json({ error: "day_changed" }, { status: 409 });
  }
  const { userId } = await auth();
  const rawGuestId = request.cookies.get("showle-player")?.value;
  const guestId =
    rawGuestId && /^[0-9a-f-]{36}$/i.test(rawGuestId)
      ? rawGuestId
      : randomUUID();
  const actorId = userId ?? `guest:${guestId}`;
  const ip = requestIp(request);
  if (
    !(await checkRateLimit(`daily:${mutate ? "write" : "read"}:${userId ?? ip}`, {
      limit: mutate ? 30 : 90,
      windowMs: 60000,
    })).success
  ) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }
  const locale =
    request.nextUrl.searchParams.get("lang") === "en" ? "en" : "pl";
  try {
    // Adopt this browser's anonymous progress only if the account has no game today.
    if (userId && rawGuestId) {
      const existing = await prisma.gameResult.findUnique({
        where: {
          userId_dateKey_mode: { userId, dateKey, mode: "daily-movie" },
        },
      });
      if (!existing) {
        const guest = await prisma.gameResult.findUnique({
          where: {
            userId_dateKey_mode: {
              userId: `guest:${guestId}`,
              dateKey,
              mode: "daily-movie",
            },
          },
        });
        if (guest) {
          for (const movieId of guest.guessIds)
            await applyDailyAction(
              userId,
              dateKey,
              { type: "guess", movieId },
              true,
            );
          if (guest.status === "lost")
            await applyDailyAction(userId, dateKey, { type: "give-up" }, true);
        }
      }
    }
    let game;
    if (mutate) {
      const body = await request.json().catch(() => null);
      const action = parseDailyAction(body);
      if (!action)
        return NextResponse.json({ error: "invalid_action" }, { status: 400 });
      game = await applyDailyAction(actorId, dateKey, action, Boolean(userId));
    }
    const response = NextResponse.json(
      await getDailyGameView(actorId, dateKey, locale, game),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
    if (!rawGuestId || rawGuestId !== guestId)
      response.cookies.set("showle-player", guestId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 31536000,
      });
    return response;
  } catch (error) {
    const errorId = reportServerError("daily.request", error);
    return NextResponse.json({ error: "game_unavailable", errorId }, { status: 503 });
  }
}
