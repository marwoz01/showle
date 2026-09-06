import { describe, expect, it, vi } from "vitest";
import {
  buildDuelInviteUrl, copyDuelInvite, getDuelResumeCode, parseDuelInvitation, shareDuelInvite,
} from "@/lib/duel-invite";

describe("duel invitation links", () => {
  it("normalizes room codes in links without including player credentials", () => {
    const url = new URL(buildDuelInviteUrl("https://showle.example/play?playerId=secret#token", " ab12cd "));
    expect(url.href).toBe("https://showle.example/play/duel?code=AB12CD");
    expect(parseDuelInvitation(url.searchParams.get("code") ?? undefined)).toEqual({ status: "valid", code: "AB12CD" });
  });
  it("preserves the current host and local port", () => {
    expect(buildDuelInviteUrl("http://localhost:3010", "ABCDEF")).toBe("http://localhost:3010/play/duel?code=ABCDEF");
  });
  it.each(["", "ABC", "ABCDEFG", "ABC-DE", "<test>", "ABC/DE", ["ABCDEF", "GHIJKL"]])(
    "rejects malformed or ambiguous invitation codes %#", (code) => {
      expect(parseDuelInvitation(code)).toEqual({ status: "invalid" });
    },
  );
  it("distinguishes a normal entry from an invalid invitation", () => {
    expect(parseDuelInvitation(undefined)).toEqual({ status: "none" });
    expect(() => buildDuelInviteUrl("https://showle.example", "bad")).toThrow("invalid_code");
    expect(() => buildDuelInviteUrl("file:///tmp/", "ABCDEF")).toThrow("invalid_origin");
  });
  it("does not restore an unrelated room when following an invitation", () => {
    expect(getDuelResumeCode(parseDuelInvitation("ABCDEF"), "GHIJKL")).toBeNull();
    expect(getDuelResumeCode(parseDuelInvitation("bad"), "GHIJKL")).toBeNull();
  });
  it("allows reconnecting to the same invited room and normal room restoration", () => {
    expect(getDuelResumeCode(parseDuelInvitation("abcdef"), "ABCDEF")).toBe("ABCDEF");
    expect(getDuelResumeCode(parseDuelInvitation(undefined), "GHIJKL")).toBe("GHIJKL");
    expect(getDuelResumeCode(parseDuelInvitation(undefined), null)).toBeNull();
    expect(getDuelResumeCode(parseDuelInvitation(undefined), "bad/saved")).toBeNull();
  });
});

describe("user-operated invitation sharing", () => {
  const url = "https://showle.example/play/duel?code=ABCDEF";
  it("copies the complete link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyDuelInvite(url, { clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(url);
  });
  it("offers manual copying if clipboard access is missing or denied", async () => {
    expect(await copyDuelInvite(url, {})).toBe("manual");
    expect(await copyDuelInvite(url, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })).toBe("manual");
  });
  it("shares only the invitation title and link through the native chooser", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareDuelInvite(url, "Showle", { share, clipboard: { writeText } })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Showle", url });
    expect(writeText).not.toHaveBeenCalled();
  });
  it("treats cancelling the chooser as a no-op", async () => {
    const writeText = vi.fn();
    const error = new DOMException("Cancelled", "AbortError");
    expect(await shareDuelInvite(url, "Showle", {
      share: vi.fn().mockRejectedValue(error), clipboard: { writeText },
    })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
  it("falls back to copying if native sharing is missing or fails", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    expect(await shareDuelInvite(url, "Showle", { clipboard })).toBe("copied");
    expect(await shareDuelInvite(url, "Showle", { clipboard, share: vi.fn().mockRejectedValue(new Error("denied")) })).toBe("copied");
    expect(await shareDuelInvite(url, "Showle", {})).toBe("manual");
  });
});
