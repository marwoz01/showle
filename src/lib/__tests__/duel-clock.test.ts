import { describe, expect, it } from "vitest";
import { synchronizeDuelClock } from "@/lib/duel-clock";

describe("duel countdown clock", () => {
  it.each([-60000, 60000])("calibrates a device clock offset of %i ms", (skew) => {
    const clock = synchronizeDuelClock(10000, 10000 + skew + 50, null);
    expect(clock.now).toBe(10000);
    expect(clock.offset).toBe(-skew - 50);
  });

  it("does not prolong a countdown digit when a later poll has a slower return path", () => {
    const initial = synchronizeDuelClock(10000, 10050, null);
    const slower = synchronizeDuelClock(10800, 11200, initial.offset);
    expect(slower.offset).toBe(initial.offset);
    expect(slower.now).toBe(11150);
    expect(Math.ceil((13000 - slower.now) / 1000)).toBe(2);
  });

  it("improves the estimate when a faster response arrives", () => {
    const initial = synchronizeDuelClock(10000, 10400, null);
    const faster = synchronizeDuelClock(11000, 11050, initial.offset);
    expect(faster.offset).toBe(-50);
    expect(faster.now).toBe(11000);
  });
});
