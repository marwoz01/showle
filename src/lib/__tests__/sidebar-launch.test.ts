import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";

const language = vi.hoisted(() => ({ locale: "pl" }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.locale === "pl" ? pl : en, locale: language.locale, setLocale: vi.fn() }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/settings" }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: null, isSignedIn: false }), useClerk: () => ({ signOut: vi.fn() }) }));
vi.mock("@/components/ui/icons", () => Object.fromEntries(["Clapperboard", "Home", "Play", "BarChart3", "Sparkles", "Library", "User", "Menu", "X", "LogOut", "Flame", "History"].map((key) => [key, () => null])));
import Sidebar from "@/components/layout/Sidebar";

describe("free-launch navigation", () => {
  it.each(["pl", "en"])("links account settings and preserves existing navigation without paid promises (%s)", (locale) => {
    language.locale = locale;
    const t = locale === "pl" ? pl : en;
    const html = renderToStaticMarkup(createElement(Sidebar));
    for (const href of ["/", "/play", "/recommend", "/collection", "/stats", "/history", "/settings"]) expect(html).toContain(`href="${href}"`);
    expect(html).toContain(t.nav.settings);
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain(t.pro.title);
    expect(html).not.toContain(t.pro.description);
    expect(html).not.toContain(t.pro.comingSoon);
  });
});
