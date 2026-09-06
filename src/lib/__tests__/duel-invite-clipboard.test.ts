import { afterEach, describe, expect, it, vi } from "vitest";
import { copyDuelInvite, INVITE_COPY_TIMEOUT_MS, shareDuelInvite } from "@/lib/duel-invite";
import { copySelectedDuelInvite, selectDuelInvite } from "@/lib/duel-invite-selection";

const url = "https://showle.example/play/duel?code=ABCDEF";
afterEach(() => { vi.useRealTimers(); });

describe("mobile invitation clipboard compatibility", () => {
  it("uses synchronous selection on touch devices before the gesture can expire", async () => {
    const fallback = vi.fn(() => true);
    const writeText = vi.fn();
    const result = copyDuelInvite(url, { clipboard: { writeText } }, fallback, true);
    expect(fallback).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    expect(await result).toBe("copied");
  });
  it("still invokes the modern API in the original gesture if synchronous copying fails", async () => {
    const fallback = vi.fn(() => false);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const result = copyDuelInvite(url, { clipboard: { writeText } }, fallback, true);
    expect(writeText).toHaveBeenCalledWith(url);
    expect(await result).toBe("copied");
    expect(fallback).toHaveBeenCalledOnce();
  });
  it("preserves the preferred modern path on non-touch browsers", async () => {
    const fallback = vi.fn(() => true);
    expect(await copyDuelInvite(url, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }, fallback)).toBe("copied");
    expect(fallback).not.toHaveBeenCalled();
  });
  it("copies synchronously when the modern API is missing", async () => {
    const fallback = vi.fn(() => true);
    const result = copyDuelInvite(url, {}, fallback);
    expect(fallback).toHaveBeenCalledOnce();
    expect(await result).toBe("copied");
  });
  it("falls back when the modern API rejects or throws", async () => {
    for (const writeText of [vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")), vi.fn(() => { throw new Error("Denied"); })]) {
      const fallback = vi.fn(() => true);
      expect(await copyDuelInvite(url, { clipboard: { writeText } }, fallback)).toBe("copied");
      expect(fallback).toHaveBeenCalledOnce();
    }
  });
  it("does not leave the copy button waiting forever on a stalled API", async () => {
    vi.useFakeTimers();
    const fallback = vi.fn(() => true);
    const result = copyDuelInvite(url, { clipboard: { writeText: () => new Promise<void>(() => {}) } }, fallback);
    await vi.advanceTimersByTimeAsync(INVITE_COPY_TIMEOUT_MS);
    expect(await result).toBe("copied");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("never reports success when both copy mechanisms fail", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Denied"));
    expect(await copyDuelInvite(url, { clipboard: { writeText } }, () => false, true)).toBe("manual");
    expect(await copyDuelInvite(url, {}, () => { throw new Error("Denied"); })).toBe("manual");
  });
  it("passes the compatibility fallback through native sharing failure", async () => {
    const fallback = vi.fn(() => true);
    expect(await shareDuelInvite(url, "Showle", { share: vi.fn().mockRejectedValue(new Error("Unavailable")) }, fallback)).toBe("copied");
    expect(fallback).toHaveBeenCalledOnce();
  });
  it("does not copy anything when the user cancels native sharing", async () => {
    const fallback = vi.fn();
    expect(await shareDuelInvite(url, "Showle", { share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) }, fallback)).toBe("cancelled");
    expect(fallback).not.toHaveBeenCalled();
  });
});

describe("selecting the visible invitation address", () => {
  const field = () => ({
    value: url, focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(),
    ownerDocument: { execCommand: vi.fn(() => true) },
  });
  it("focuses without scrolling, selects the complete address and copies only that selection", () => {
    const input = field();
    expect(copySelectedDuelInvite(input)).toBe(true);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.setSelectionRange).toHaveBeenCalledWith(0, url.length);
    expect(input.ownerDocument.execCommand).toHaveBeenCalledWith("copy");
    expect(input.setSelectionRange.mock.invocationCallOrder[0]).toBeLessThan(input.ownerDocument.execCommand.mock.invocationCallOrder[0]);
  });
  it("does not copy an empty or missing field", () => {
    const input = { ...field(), value: "" };
    expect(copySelectedDuelInvite(input)).toBe(false);
    expect(copySelectedDuelInvite(null)).toBe(false);
    expect(input.ownerDocument.execCommand).not.toHaveBeenCalled();
  });
  it("does not claim successful selection or copying when the browser refuses", () => {
    const input = field();
    input.setSelectionRange.mockImplementation(() => { throw new Error("Unavailable"); });
    expect(selectDuelInvite(input)).toBe(false);
    expect(copySelectedDuelInvite(input)).toBe(false);
    expect(input.ownerDocument.execCommand).not.toHaveBeenCalled();
    const denied = field();
    denied.ownerDocument.execCommand.mockReturnValue(false);
    expect(copySelectedDuelInvite(denied)).toBe(false);
  });
});
