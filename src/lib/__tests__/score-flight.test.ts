import { describe, expect, it } from "vitest";
import { scoreFlight } from "@/lib/score-flight";

describe("score reward flight", () => {
  it.each([
    {
      name: "mobile",
      frame: { left: 24, top: 190, width: 327, height: 180 },
      layer: { left: 16, top: 100, width: 343, height: 530 },
      counter: { left: 120, top: 137, width: 40, height: 28 },
    },
    {
      name: "desktop with sidebar",
      frame: { left: 328, top: 200, width: 1000, height: 420 },
      layer: { left: 320, top: 110, width: 1016, height: 760 },
      counter: { left: 726, top: 139, width: 64, height: 32 },
    },
    {
      name: "scrolled page and a different score width",
      frame: { left: 328, top: -30, width: 1000, height: 420 },
      layer: { left: 320, top: -120, width: 1016, height: 760 },
      counter: { left: 690, top: -91, width: 100, height: 32 },
    },
  ])(
    "starts at the frame center and lands on the total: $name",
    ({ frame, layer, counter }) => {
      const flight = scoreFlight(frame, layer, counter);
      expect(layer.left + flight.left).toBe(frame.left + frame.width / 2);
      expect(layer.top + flight.top).toBe(frame.top + frame.height / 2);
      expect(layer.left + flight.left + flight.x).toBe(
        counter.left + counter.width / 2,
      );
      expect(layer.top + flight.top + flight.y).toBe(
        counter.top + counter.height / 2,
      );
    },
  );
});
