import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubEnv("TRUSTED_PROXY", "forwarded"); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); });
const request = (player: string) => new Request("https://showle.test", { headers: {
  "x-forwarded-for": "203.0.113.9", "x-duel-player": player,
} });

describe("duel participants on shared Wi-Fi", () => {
  it("allows four ordinary clients to poll at 900ms behind the same public IP", async () => {
    const { allowDuelRequest } = await import("@/lib/duel-rate-limit");
    for (let round = 0; round < 67; round++) {
      for (let player = 0; player < 4; player++) expect(await allowDuelRequest(request(`player-${player}`), "state")).toBe(true);
    }
  });
  it("contains one participant without consuming the whole Wi-Fi budget", async () => {
    const { allowDuelRequest } = await import("@/lib/duel-rate-limit");
    for (let attempt = 0; attempt < 120; attempt++) expect(await allowDuelRequest(request("player-a"), "state")).toBe(true);
    expect(await allowDuelRequest(request("player-a"), "state")).toBe(false);
    expect(await allowDuelRequest(request("player-b"), "state")).toBe(true);
  });
});
