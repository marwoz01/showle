import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), query: vi.fn(), execute: vi.fn(), models: Object.fromEntries([
  "rankedList", "savedMovie", "gameResult", "userStats", "userWallet", "coinTransaction",
  "recommendationFeedback", "recommendationSettings", "dailyUsage",
].map((name) => [name, { deleteMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() }])) }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { clearAccountData, exportAccountData, processAccountDeletionTasks } from "@/lib/account-data";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((callback) => callback({ ...mocks.models, $executeRaw: mocks.execute, $queryRaw: mocks.query }));
  mocks.query.mockResolvedValue([]); mocks.execute.mockResolvedValue(0);
  for (const model of Object.values(mocks.models)) {
    model.findMany.mockResolvedValue([]); model.findUnique.mockResolvedValue(null); model.deleteMany.mockResolvedValue({ count: 0 });
  }
});
describe("account data lifecycle", () => {
  it("clears all owned application tables in one transaction and preserves active quotas", async () => {
    await clearAccountData("user_owner");
    for (const [name, model] of Object.entries(mocks.models)) {
      if (name === "dailyUsage") expect(model.deleteMany).not.toHaveBeenCalled();
      else expect(model.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_owner" } });
    }
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("uses exact account quota matching and schedules a retryable delayed deletion", async () => {
    await clearAccountData("user_owner", true);
    await clearAccountData("user_owner", true);
    const quotaCalls = mocks.execute.mock.calls.filter(([parts]) => parts.join("").includes('DELETE FROM "DailyUsage"'));
    expect(quotaCalls).toHaveLength(2);
    expect(quotaCalls[0][0].join("")).toContain("split_part(key, ':', 2) = ANY(");
    expect(quotaCalls[0][1]).toEqual(["user_owner"]);
    const queueCalls = mocks.execute.mock.calls.filter(([parts]) => parts.join("").includes('INSERT INTO "AccountDeletionTask"'));
    expect(queueCalls).toHaveLength(2);
    expect(queueCalls[0][0].join("")).toContain("INTERVAL '10 minutes'");
    expect(queueCalls[0][1]).toBe("user_owner");
  });
  it("does not acknowledge a failed cleanup transaction", async () => {
    mocks.models.savedMovie.deleteMany.mockRejectedValue(new Error("database"));
    await expect(clearAccountData("user_owner")).rejects.toThrow("database");
    expect(mocks.models.userWallet.deleteMany).not.toHaveBeenCalled();
  });
  it("requires a real account scope before writes", async () => {
    await expect(clearAccountData("")).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("exports owned data and rankings in a consistent snapshot without duel secrets", async () => {
    const result = await exportAccountData("user_owner");
    expect(result.version).toBe(1);
    for (const [name, model] of Object.entries(mocks.models)) {
      if (name === "dailyUsage") continue;
      const calls = [...model.findMany.mock.calls, ...model.findUnique.mock.calls];
      expect(calls[0][0]).toMatchObject({ where: { userId: "user_owner" } });
    }
    expect(mocks.transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: "RepeatableRead" });
    expect(result.usage).toEqual([]);
    expect(mocks.query.mock.calls[0][0].join("")).toContain("split_part(key, ':', 2) = ");
    expect(mocks.query.mock.calls[0][1]).toBe("user_owner");
  });
  it("re-clears due accounts under a queue lock and removes tasks only after successful cleanup", async () => {
    mocks.query.mockResolvedValue([{ userId: "user_deleted" }, { userId: "user_second" }]);
    expect(await processAccountDeletionTasks()).toBe(2);
    expect(mocks.query.mock.calls[0][0].join("")).toContain('"retryAfter" <= CURRENT_TIMESTAMP');
    expect(mocks.query.mock.calls[0][0].join("")).toContain("LIMIT 10 FOR UPDATE SKIP LOCKED");
    expect(mocks.models.savedMovie.deleteMany).toHaveBeenCalledWith({ where: { userId: { in: ["user_deleted", "user_second"] } } });
    expect(mocks.execute.mock.calls.at(-1)?.[0].join("")).toContain('DELETE FROM "AccountDeletionTask"');
    expect(mocks.execute.mock.calls.at(-1)?.[1]).toEqual(["user_deleted", "user_second"]);
  });
  it("leaves the deferred task for retry if account cleanup fails", async () => {
    mocks.query.mockResolvedValue([{ userId: "user_deleted" }]);
    mocks.models.savedMovie.deleteMany.mockRejectedValue(new Error("database"));
    await expect(processAccountDeletionTasks()).rejects.toThrow("database");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("does not mutate account records when no task is due", async () => {
    expect(await processAccountDeletionTasks()).toBe(0);
    expect(mocks.models.savedMovie.deleteMany).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
