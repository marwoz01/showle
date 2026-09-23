import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ userId: "viewer" as string | null, wallet: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/gems", () => ({ getGemWallet: mocks.wallet }));
import { GET } from "@/app/api/user/wallet/route";

beforeEach(() => { vi.clearAllMocks(); mocks.userId = "viewer"; });
describe("private gem wallet API", () => {
  it("rejects guests before reading or reconciling rewards", async () => {
    mocks.userId = null;
    expect((await GET()).status).toBe(401);
    expect(mocks.wallet).not.toHaveBeenCalled();
  });
  it("uses the verified actor and prevents shared caching", async () => {
    const wallet = { balance: 25, streakFreezes: 0, transactions: [], earnedRewardKeys: ["badge:daily-first-win"] };
    mocks.wallet.mockResolvedValue(wallet);
    const response = await GET();
    expect(await response.json()).toEqual(wallet);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.wallet).toHaveBeenCalledWith("viewer");
  });
  it("returns a recoverable error without exposing database details", async () => {
    mocks.wallet.mockRejectedValue(new Error("private database error"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await GET();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Could not load wallet" });
    } finally { log.mockRestore(); }
  });
});
