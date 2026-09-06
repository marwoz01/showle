import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import { preferences } from "@/lib/__tests__/fixtures/recommendations";
import type { RecommendationMeta } from "@/types/recommendation";
const locale = vi.hoisted(() => ({ value: "pl" }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: locale.value === "pl" ? pl : en, locale: locale.value }) }));
vi.mock("@/components/game/SearchBar", () => ({ default: ({ placeholder }: { placeholder: string }) => createElement("input", { placeholder }) }));
vi.mock("@/components/recommend/RecommendationCard", () => ({ default: () => createElement("div", { role: "button" }, "Film") }));
vi.mock("@/components/ui/icons", () => ({ Sparkles: () => null, X: () => null }));
import PreferenceForm from "@/components/recommend/PreferenceForm";
import RecommendationResults from "@/components/recommend/RecommendationResults";
describe("recommendation UI contracts", () => {
  it.each(["pl", "en"])("renders localized advanced controls in %s", (language) => {
    locale.value = language;
    const t = language === "pl" ? pl : en;
    const html = renderToStaticMarkup(createElement(PreferenceForm, {
      initial: preferences, initialReference: null, onSubmit: () => {}, remaining: 1, quotaLimit: 1,
    }));
    expect(html).toContain(t.recommendation.advanced);
    expect(html).toContain(t.recommendation.referencePlaceholder);
    expect(html).toContain(t.recommendation.providersHint);
    expect(html).toContain("Netflix");
    expect(html).toContain('maxLength="400"');
    expect(html).toContain('<details');
  });
  it("offers login when the anonymous quota has run out", () => {
    locale.value = "pl";
    const html = renderToStaticMarkup(createElement(PreferenceForm, {
      initial: preferences, initialReference: null, onSubmit: () => {}, remaining: 0, quotaLimit: 1,
    }));
    expect(html).toContain(pl.recommend.loginForMore);
    expect(html).toContain('href="/sign-in"');
  });
  it("shows the degradation notice for failed reference review without blaming a skipped translation", () => {
    locale.value = "pl";
    const base = { results: [], feedback: {}, pending: [], feedbackReady: true, onReact: () => {}, hasDescription: false, hasReference: true };
    const meta: RecommendationMeta = { matching: "semantic", interpretation: "local", relevance: "ai", partial: false, personalized: false };
    expect(renderToStaticMarkup(createElement(RecommendationResults, { ...base, meta }))).not.toContain(pl.recommendation.degraded);
    expect(renderToStaticMarkup(createElement(RecommendationResults, { ...base, meta: { ...meta, relevance: "local" } }))).toContain(pl.recommendation.degraded);
  });
});
