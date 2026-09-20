import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";

const language = vi.hoisted(() => ({ value: "pl" }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.value === "pl" ? pl : en, locale: language.value }) }));
vi.mock("@/components/game/SearchBar", () => ({ default: ({ placeholder, disabled }: { placeholder: string; disabled: boolean }) => createElement("input", { placeholder, disabled }) }));
vi.mock("@/components/ui/icons", () => ({ X: () => null }));
import PersonalPreferencesForm from "@/components/recommend/PersonalPreferencesForm";
import PersonalRefinementForm from "@/components/recommend/PersonalRefinementForm";

const initial = { favoriteIds: [], providerIds: [8], onboarded: false };
const unescape = (value: string) => value.replaceAll("&#x27;", "'").replaceAll("&amp;", "&");

describe("personal recommendation forms", () => {
  it.each(["pl", "en"])("offers favorite discovery, remembered services and an explicit skip (%s)", (locale) => {
    language.value = locale;
    const t = locale === "pl" ? pl : en;
    const html = unescape(renderToStaticMarkup(createElement(PersonalPreferencesForm, {
      initial, signedIn: false, saving: false, error: false, onSave: () => {},
    })));
    expect(html).toContain(t.recommendationHome.favoriteSearch);
    expect(html).toContain(t.recommendationHome.guestHint);
    expect(html).toContain(t.recommendationHome.skip);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Netflix");
    expect(html).not.toContain('type="submit" disabled');
  });
  it("keeps account preference saving explicit and prevents duplicate submits", () => {
    language.value = "en";
    const html = unescape(renderToStaticMarkup(createElement(PersonalPreferencesForm, {
      initial, signedIn: true, saving: true, error: true, onSave: () => {}, onCancel: () => {},
    })));
    expect(html).toContain(en.recommendationHome.accountHint);
    expect(html).not.toContain(en.recommendationHome.guestHint);
    expect(html).toContain('type="submit" disabled=""');
    expect(html).toContain('role="alert"');
    expect(html).toContain(en.recommendationHome.cancel);
  });
  it("allows cold-start users to proceed without a favorite and bounds the search when five are chosen", () => {
    const html = renderToStaticMarkup(createElement(PersonalPreferencesForm, {
      initial: { ...initial, favoriteIds: [1, 2, 3, 4, 5] }, signedIn: false, saving: false, error: false, onSave: () => {},
    }));
    expect(html).toContain('placeholder="Search for a movie you love…" disabled=""');
    expect(html).not.toContain('type="submit" disabled');
  });
  it.each(["pl", "en"])("keeps mood, duration and a reference optional (%s)", (locale) => {
    language.value = locale;
    const t = locale === "pl" ? pl : en;
    const html = unescape(renderToStaticMarkup(createElement(PersonalRefinementForm, { disabled: false, onSubmit: () => {} })));
    expect(html).toContain('maxLength="400"');
    expect(html).toContain(t.recommendationHome.short);
    expect(html).toContain(t.recommendationHome.light);
    expect(html).toContain(t.recommendation.referencePlaceholder);
    expect(html).not.toContain('required');
    expect(html).toContain('<details>');
  });
});
