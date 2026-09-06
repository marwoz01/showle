import { prisma } from "@/lib/prisma";
import { MAX_ATTEMPTS } from "@/constants";
import { getDailyMovieId } from "@/lib/daily";
import { getMovieSnapshot } from "@/lib/movie-snapshot";
import { compareMedia } from "@/lib/comparer";
import { generateHints, getRevealedHints } from "@/lib/hints";
import { getWinReward, STREAK_MILESTONES } from "@/lib/coins";
import { previousDateKey, normalizeStoredDate } from "@/lib/game-date";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import type { DailyGameView } from "@/types/daily-game";
import type { GameResult } from "@prisma/client";

export type DailyAction = { type: "guess"; movieId: number } | { type: "give-up" };

export function parseDailyAction(body: unknown): DailyAction | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  if (input.type === "give-up") return { type: "give-up" };
  return input.type === "guess" && Number.isSafeInteger(input.movieId) && Number(input.movieId) > 0
    ? { type: "guess", movieId: Number(input.movieId) } : null;
}

export async function applyDailyAction(actorId: string, dateKey: string, action: DailyAction, rewarded: boolean) {
  const answer = await getMovieSnapshot(dateKey, getDailyMovieId(dateKey));
  // Verify the selected ID exists before recording it; do network work outside the transaction.
  if (action.type === "guess") await getMovieSnapshot(dateKey, action.movieId);

  return prisma.$transaction(async (tx) => {
    // One writer per player, including requests from multiple tabs/devices.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actorId}))`;
    const where = { userId_dateKey_mode: { userId: actorId, dateKey, mode: "daily-movie" } };
    const existing = await tx.gameResult.findUnique({ where });
    if (existing && existing.status !== "playing") return existing;
    const guessIds = existing?.guessIds ?? [];
    if (action.type === "guess" && guessIds.includes(action.movieId)) return existing!;
    if (action.type === "guess" && guessIds.length < MAX_ATTEMPTS) guessIds.push(action.movieId);
    const won = guessIds.at(-1) === answer.id;
    const status = won ? "won" : action.type === "give-up" || guessIds.length >= MAX_ATTEMPTS ? "lost" : "playing";
    const hintsUsed = [2, 4, 6].filter((threshold) => guessIds.length >= threshold).length;
    const data = { status, guessIds, attemptCount: guessIds.length, hintsUsed,
      targetMovieId: answer.id, targetTitle: answer.title, targetYear: answer.year,
      targetPoster: answer.posterPath, completedAt: new Date() };
    const result = await tx.gameResult.upsert({ where, update: data,
      create: { userId: actorId, dateKey, mode: "daily-movie", ...data } });
    if (!rewarded || status === "playing") return result;

    const stats = await tx.userStats.findUnique({ where: { userId: actorId } });
    const wallet = await tx.userWallet.upsert({ where: { userId: actorId }, update: {}, create: { userId: actorId } });
    const previousStreak = normalizeStoredDate(stats?.lastPlayedDate) === previousDateKey(dateKey) ? stats!.currentStreak : 0;
    const freezeUsed = !won && previousStreak > 0 && wallet.streakFreezes > 0;
    const currentStreak = won ? previousStreak + 1 : freezeUsed ? previousStreak : 0;
    const reward = won ? getWinReward(guessIds.length) + (STREAK_MILESTONES[currentStreak] ?? 0) : 0;
    const gamesPlayed = (stats?.gamesPlayed ?? 0) + 1;
    const statData = { gamesPlayed, gamesWon: (stats?.gamesWon ?? 0) + Number(won), currentStreak,
      maxStreak: Math.max(stats?.maxStreak ?? 0, currentStreak), lastPlayedDate: dateKey,
      averageGuesses: ((stats?.averageGuesses ?? 0) * (stats?.gamesPlayed ?? 0) + guessIds.length) / gamesPlayed };
    await tx.userStats.upsert({ where: { userId: actorId }, update: statData, create: { userId: actorId, ...statData } });
    await tx.userWallet.update({ where: { userId: actorId }, data: {
      balance: { increment: reward }, streakFreezes: { decrement: Number(freezeUsed) },
    } });
    await tx.coinTransaction.create({ data: { userId: actorId, amount: reward,
      reason: won ? "win_reward" : freezeUsed ? "use_freeze" : "game_completed", dateKey } });
    return result;
  }, { timeout: 15000 });
}

export async function getDailyGameView(actorId: string, dateKey: string, locale: "pl" | "en", game?: GameResult | null): Promise<DailyGameView> {
  const t = locale === "pl" ? pl : en;
  const saved = game === undefined ? await prisma.gameResult.findUnique({
    where: { userId_dateKey_mode: { userId: actorId, dateKey, mode: "daily-movie" } },
  }) : game;
  const answer = await getMovieSnapshot(dateKey, getDailyMovieId(dateKey));
  const status = saved?.status === "won" || saved?.status === "lost" ? saved.status : "playing";
  const guesses = await Promise.all((saved?.guessIds ?? []).map(async (id, index) => {
    const movie = await getMovieSnapshot(dateKey, id);
    const display = await getMovieSnapshot(dateKey, id, locale);
    return { guess: display, attemptNumber: index + 1, isCorrect: id === answer.id,
      comparison: compareMedia(movie, answer, t, locale).map((field) => ({ ...field,
        answerValue: field.status === "exact" || status !== "playing" ? field.answerValue : "",
      })) };
  }));
  const localized = await getMovieSnapshot(dateKey, answer.id, locale);
  const hintAnswer = { ...answer, title: localized.title, overview: localized.overview, tagline: localized.tagline };
  const exactLabels = new Set(guesses.flatMap((g) => g.comparison.filter((f) => f.status === "exact").map((f) => f.label)));
  return { dateKey, status, guesses: guesses.reverse(),
    hints: getRevealedHints(generateHints(hintAnswer, t), guesses.length),
    answer: status === "playing" ? null : localized,
    revealedPeople: {
      ...(exactLabels.has(t.comparison.director) ? { directorProfilePath: answer.directorProfilePath } : {}),
      ...(exactLabels.has(t.comparison.leadActor) ? { cast: answer.cast?.filter((member) => member.name === answer.leadActor) } : {}),
    },
  };
}
