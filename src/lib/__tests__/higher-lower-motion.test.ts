import { describe, expect, it, vi } from "vitest";
import gsap from "gsap";
import { addHigherLowerReveal, HIGHER_LOWER_MOTION } from "@/components/game/higher-lower/higherLowerReveal";

describe("higher/lower year reveal sequence", () => {
  it("counts from zero, decelerates, hesitates below the answer, then reveals and holds", () => {
    const onYear = vi.fn(); const onReveal = vi.fn(); const onHold = vi.fn();
    const timeline = addHigherLowerReveal(gsap.timeline({ paused: true }), 2024, { onYear, onReveal, onHold }, false);
    expect(onYear).toHaveBeenLastCalledWith(0);
    timeline.time(HIGHER_LOWER_MOTION.count / 2, false);
    const halfway = onYear.mock.lastCall![0] as number;
    expect(halfway).toBeGreaterThan(1800);
    expect(halfway).toBeLessThan(2024);
    expect(onReveal).not.toHaveBeenCalled();
    timeline.time(HIGHER_LOWER_MOTION.count + HIGHER_LOWER_MOTION.hesitation / 2, false);
    expect(onYear).toHaveBeenLastCalledWith(2023);
    expect(onReveal).not.toHaveBeenCalled();
    timeline.time(HIGHER_LOWER_MOTION.count + HIGHER_LOWER_MOTION.hesitation + 0.01, false);
    expect(onYear).toHaveBeenLastCalledWith(2024);
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onHold).not.toHaveBeenCalled();
    timeline.progress(1, false);
    expect(onHold).toHaveBeenCalledOnce();
    timeline.kill();
  });

  it("skips counting for reduced motion while retaining the result reading time", () => {
    const onYear = vi.fn(); const onReveal = vi.fn(); const onHold = vi.fn();
    const timeline = addHigherLowerReveal(gsap.timeline({ paused: true }), 1997, { onYear, onReveal, onHold }, true);
    timeline.time(0.01, false);
    expect(onYear.mock.calls.every(([year]) => year === 1997)).toBe(true);
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onHold).not.toHaveBeenCalled();
    expect(timeline.duration()).toBe(HIGHER_LOWER_MOTION.hold);
    timeline.progress(1, false);
    expect(onHold).toHaveBeenCalledOnce();
    timeline.kill();
  });

  it("does not publish a delayed outcome after the timeline is killed", () => {
    const onYear = vi.fn(); const onReveal = vi.fn(); const onHold = vi.fn();
    const timeline = addHigherLowerReveal(gsap.timeline({ paused: true }), 2001, { onYear, onReveal, onHold }, false);
    timeline.time(0.5, false).kill();
    expect(onReveal).not.toHaveBeenCalled();
    expect(onHold).not.toHaveBeenCalled();
  });
});
