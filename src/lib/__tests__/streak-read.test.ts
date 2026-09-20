import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ stats: vi.fn(), wallet: vi.fn(), transaction: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "owner" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { userStats: { findUnique: mocks.stats }, userWallet: { findUnique: mocks.wallet }, $transaction: mocks.transaction } }));
import { GET as stats } from "@/app/api/user/stats/route";
import { GET as wallet } from "@/app/api/user/wallet/route";
import { GET as check } from "@/app/api/game/streak-check/route";
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-07T10:00:00Z"));
  mocks.transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  mocks.stats.mockResolvedValue({ currentStreak: 5, maxStreak: 8, lastPlayedDate: "2026-09-04", gamesPlayed: 12, gamesWon: 8, averageGuesses: 3 });
  mocks.wallet.mockResolvedValue({ balance: 100, streakFreezes: 3 });
});
afterEach(() => vi.useRealTimers());
describe("streak read endpoints", () => {
  it("projects identical remaining freezes without consuming them on GET", async () => {
    const statistics = await stats();
    expect(await statistics.json()).toMatchObject({ currentStreak: 5, streakFreezes: 1, maxStreak: 8 });
    expect(await (await wallet()).json()).toEqual({ balance: 100, streakFreezes: 1 });
    expect(await (await check()).json()).toMatchObject({ status: "freeze_pending", currentStreak: 5, remainingFreezes: 1 });
    expect(await (await stats()).json()).toMatchObject({ currentStreak: 5, streakFreezes: 1 });
    expect(statistics.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.transaction.mock.calls.every((call) => call[1].isolationLevel === "RepeatableRead")).toBe(true);
  });
  it("reports a broken series immediately when freezes cannot cover the gap", async () => {
    mocks.wallet.mockResolvedValue({ balance: 100, streakFreezes: 1 });
    expect(await (await stats()).json()).toMatchObject({ currentStreak: 0, maxStreak: 8, streakFreezes: 1 });
  });
});
