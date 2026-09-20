import { describe, expect, it, vi } from "vitest";
import { createLocalePreference } from "@/lib/locale-preference";

describe("locale persistence", () => {
  it("uses the server-provided locale when persistent storage is missing or blocked", () => {
    const preference = createLocalePreference();
    expect(preference.read(() => null, "en")).toBe("en");
    expect(preference.read(() => { throw new Error("SecurityError"); }, "en")).toBe("en");
    expect(preference.read(() => "invalid", "pl")).toBe("pl");
  });
  it("restores an allowed stored language", () => {
    const preference = createLocalePreference();
    expect(preference.read(() => "en", "pl")).toBe("en");
    expect(preference.read(() => "pl", "en")).toBe("pl");
  });
  it("preserves a new selection in the current tab when writing fails but old storage can still be read", () => {
    const preference = createLocalePreference();
    const write = vi.fn(() => { throw new Error("QuotaExceededError"); });
    expect(() => preference.set("en", write)).not.toThrow();
    expect(write).toHaveBeenCalledWith("en");
    expect(preference.read(() => "pl", "pl")).toBe("en");
    expect(preference.read(() => { throw new Error("SecurityError"); }, "pl")).toBe("en");
  });
  it("accepts a newer language change from another tab and handles clearing storage", () => {
    const preference = createLocalePreference();
    preference.set("en", () => {});
    preference.external("pl");
    expect(preference.read(() => "en", "en")).toBe("pl");
    preference.external(null);
    expect(preference.read(() => null, "en")).toBe("en");
  });
  it("keeps fallback memory isolated between independent stores", () => {
    const first = createLocalePreference();
    const second = createLocalePreference();
    first.set("en", () => {});
    expect(second.read(() => null, "pl")).toBe("pl");
  });
});
