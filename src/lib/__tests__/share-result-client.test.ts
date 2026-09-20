import { afterEach, describe, expect, it, vi } from "vitest";
import { shareResultText } from "@/lib/share-result-client";

const text = "Showle · Daily movie · 2026-09-11\n2/7\n🟩🟨⬛\nhttps://showle.example/play/movie";
afterEach(() => vi.useRealTimers());

describe("result sharing", () => {
  it("passes the complete result text to native sharing without copying it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareResultText(text, { share, clipboard: { writeText } })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Showle", text });
    expect(writeText).not.toHaveBeenCalled();
  });
  it.each([new DOMException("Cancelled", "AbortError"), { name: "AbortError" }])("respects native cancellation without a clipboard side effect", async (error) => {
    const writeText = vi.fn();
    expect(await shareResultText(text, { share: vi.fn().mockRejectedValue(error), clipboard: { writeText } })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
  it("falls back to actual copying when native sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareResultText(text, { clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(text);
  });
  it("falls back to copying if the native chooser fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareResultText(text, { share: vi.fn().mockRejectedValue(new Error("unsupported")), clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(text);
  });
  it("requests manual copy when both browser APIs are absent or denied", async () => {
    expect(await shareResultText(text, {})).toBe("manual");
    expect(await shareResultText(text, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })).toBe("manual");
  });
  it("bounds a hung clipboard request instead of reporting success or leaving the action busy forever", async () => {
    vi.useFakeTimers();
    const result = shareResultText(text, { clipboard: { writeText: () => new Promise<void>(() => {}) } });
    await vi.advanceTimersByTimeAsync(2001);
    expect(await result).toBe("manual");
  });
});
