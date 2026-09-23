import { describe, expect, it, vi } from "vitest";
import { createGemRewardPresentation, getGemDisplayedBalance } from "@/lib/gem-reward-presentation";
import type { GemsWallet } from "@/types/gems";

const wallet = (balance = 140): GemsWallet => ({
  balance, streakFreezes: 0, earnedRewardKeys: [],
  transactions: [{ id: "receipt-a", amount: 40, reason: "win_reward", rewardKey: "daily:2026-09-23", dateKey: "2026-09-23", createdAt: "2026-09-23T12:00:00.000Z" }],
});

describe("gem reward balance presentation", () => {
  it("requires a positive existing receipt and never changes the authoritative wallet", () => {
    const presentation = createGemRewardPresentation();
    expect(presentation.beginReward("receipt-a")).toBe(false);
    const data = wallet();
    presentation.setWallet(data);
    expect(presentation.beginReward("missing")).toBe(false);
    expect(presentation.beginReward("receipt-a")).toBe(true);
    expect(getGemDisplayedBalance(data, presentation.getSnapshot())).toBe(100);
    presentation.collectReward("receipt-a", 8);
    expect(getGemDisplayedBalance(data, presentation.getSnapshot())).toBe(108);
    expect(data.balance).toBe(140);
    expect(data.transactions[0].amount).toBe(40);
  });

  it.each([0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects an invalid receipt amount %s", (amount) => {
    const presentation = createGemRewardPresentation();
    const data = wallet();
    data.transactions[0].amount = amount;
    presentation.setWallet(data);
    expect(presentation.beginReward("receipt-a")).toBe(false);
    expect(presentation.getSnapshot()).toBeNull();
  });

  it("keeps repeated begin calls idempotent, ignores other receipts and clamps collection", () => {
    const presentation = createGemRewardPresentation();
    const data = wallet();
    data.transactions.push({ ...data.transactions[0], id: "receipt-b" });
    presentation.setWallet(data);
    presentation.beginReward("receipt-a");
    presentation.collectReward("receipt-a", 7);
    expect(presentation.beginReward("receipt-a")).toBe(true);
    expect(presentation.getSnapshot()?.remaining).toBe(33);
    expect(presentation.beginReward("receipt-b")).toBe(false);
    presentation.collectReward("receipt-b", 10);
    presentation.finishReward("receipt-b");
    expect(presentation.getSnapshot()?.remaining).toBe(33);
    presentation.collectReward("receipt-a", 999);
    expect(getGemDisplayedBalance(data, presentation.getSnapshot())).toBe(140);
    presentation.collectReward("receipt-a", 999);
    expect(presentation.getSnapshot()?.remaining).toBe(0);
  });

  it("ignores invalid arrivals and allows begin again after StrictMode cleanup", () => {
    const presentation = createGemRewardPresentation();
    presentation.setWallet(wallet());
    presentation.beginReward("receipt-a");
    for (const amount of [-1, 0, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) presentation.collectReward("receipt-a", amount);
    expect(presentation.getSnapshot()?.remaining).toBe(40);
    presentation.finishReward("receipt-a");
    expect(presentation.getSnapshot()).toBeNull();
    expect(presentation.beginReward("receipt-a")).toBe(true);
    expect(presentation.getSnapshot()?.remaining).toBe(40);
  });

  it("uses refreshed authoritative balances while retaining only the pending animation", () => {
    const presentation = createGemRewardPresentation();
    presentation.setWallet(wallet());
    presentation.beginReward("receipt-a");
    presentation.collectReward("receipt-a", 10);
    const refreshed = wallet(240);
    presentation.setWallet(refreshed);
    expect(getGemDisplayedBalance(refreshed, presentation.getSnapshot())).toBe(210);
    presentation.finishReward("receipt-a");
    expect(getGemDisplayedBalance(refreshed, presentation.getSnapshot())).toBe(240);
    expect(getGemDisplayedBalance(null, presentation.getSnapshot())).toBeNull();
  });

  it("isolates old callbacks from a new account, route or reset scope", () => {
    const oldScope = createGemRewardPresentation();
    oldScope.setWallet(wallet());
    oldScope.beginReward("receipt-a");
    const newScope = createGemRewardPresentation();
    const nextData = wallet(20);
    newScope.setWallet(nextData);
    oldScope.collectReward("receipt-a", 10);
    oldScope.finishReward("receipt-a");
    expect(newScope.getSnapshot()).toBeNull();
    expect(getGemDisplayedBalance(nextData, newScope.getSnapshot())).toBe(20);
    newScope.beginReward("receipt-a");
    expect(getGemDisplayedBalance(nextData, newScope.getSnapshot())).toBe(0);
  });

  it("notifies subscribed consumers only for actual presentation changes", () => {
    const presentation = createGemRewardPresentation();
    const onChange = vi.fn();
    const unsubscribe = presentation.subscribe(onChange);
    presentation.setWallet(wallet());
    expect(onChange).not.toHaveBeenCalled();
    presentation.beginReward("receipt-a");
    const initial = presentation.getSnapshot();
    expect(presentation.getSnapshot()).toBe(initial);
    presentation.beginReward("receipt-a");
    presentation.collectReward("missing", 20);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    presentation.collectReward("receipt-a", 1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
