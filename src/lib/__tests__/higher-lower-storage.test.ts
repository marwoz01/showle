import { afterEach, describe, expect, it, vi } from "vitest";
import { clearHigherLowerAccountStorage, HIGHER_LOWER_ACCOUNT_RESET_EVENT, higherLowerStorageKeys, readHigherLowerBest } from "@/lib/higher-lower-storage";

afterEach(() => vi.unstubAllGlobals());

describe("higher/lower account storage", () => {
  it("keeps guests and each account in distinct scopes without importing a device record", () => {
    const keys = [higherLowerStorageKeys(null), higherLowerStorageKeys("user_a"), higherLowerStorageKeys("user_b")];
    expect(new Set(keys.map((entry) => entry.best)).size).toBe(3);
    expect(new Set(keys.map((entry) => entry.session)).size).toBe(3);
    const values = new Map([[keys[0].best, "999"], [keys[1].best, "7"]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null });
    expect(readHigherLowerBest(keys[0].best)).toBe(999);
    expect(readHigherLowerBest(keys[1].best)).toBe(7);
    expect(readHigherLowerBest(keys[2].best)).toBe(0);
  });

  it("clears only the chosen account and emits invalidation for an active game", () => {
    const local = vi.fn(); const session = vi.fn(); const dispatch = vi.fn();
    vi.stubGlobal("localStorage", { removeItem: local });
    vi.stubGlobal("sessionStorage", { removeItem: session });
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    clearHigherLowerAccountStorage("user_a");
    expect(local).toHaveBeenCalledExactlyOnceWith(higherLowerStorageKeys("user_a").best);
    expect(session).toHaveBeenCalledExactlyOnceWith(higherLowerStorageKeys("user_a").session);
    const event = dispatch.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(HIGHER_LOWER_ACCOUNT_RESET_EVENT);
    expect(event.detail).toBe("user_a");
  });

  it.each(["NaN", "-1", "1.5", "Infinity", "9007199254740992"])("ignores an invalid cached record %s", (stored) => {
    vi.stubGlobal("localStorage", { getItem: () => stored });
    expect(readHigherLowerBest("key")).toBe(0);
  });
});
