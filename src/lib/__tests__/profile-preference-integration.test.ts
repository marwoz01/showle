import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import type { MovieChoicePreferences } from "@/types/movie-choice";

const mocks = vi.hoisted(() => ({ defaults: { owner: "guest", loading: false, preferences: null as MovieChoicePreferences | null, failed: false } }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: pl, locale: "pl" }) }));
vi.mock("@/hooks/useProfilePreferences", () => ({
  useProfilePreferences: () => mocks.defaults,
  hasProfilePreferences: (value: MovieChoicePreferences | null) => Boolean(value && (value.genres.length || value.excludedGenres.length || value.providerIds.length || value.maxRuntime !== null)),
}));
vi.mock("@/hooks/useRecommendationFeedback", () => ({ useRecommendationFeedback: () => ({ isLoaded: true, userId: mocks.defaults.owner === "guest" ? null : mocks.defaults.owner, pending: [], feedback: {} }) }));
vi.mock("@/components/game/SearchBar", () => ({ default: () => null }));
vi.mock("@/components/recommend/RecommendationResults", () => ({ default: () => null }));

import MovieChoicePreferencesForm from "@/components/recommend/MovieChoicePreferences";
import SoloRecommendPage from "@/app/recommend/solo/page";
import { profileIntegrationCopy } from "@/i18n/profile-integrations";

const saved: MovieChoicePreferences = { genres: ["Comedy"], excludedGenres: ["Horror"], providerIds: [8], maxRuntime: 90 };
const buttons = (html: string) => html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
const selected = (html: string, text: string) => buttons(html).some((button) => button.includes('aria-pressed="true"') && button.includes(`>${text}</button>`));

beforeEach(() => { mocks.defaults = { owner: "guest", loading: false, preferences: null, failed: false }; });

describe("profile defaults in film choice", () => {
  it.each(["solo", "together"])("prefills stored taste, exclusions, services and runtime in %s", (mode) => {
    mocks.defaults = { owner: "user_a", loading: false, preferences: saved, failed: false };
    const html = renderToStaticMarkup(mode === "solo" ? createElement(SoloRecommendPage) : createElement(MovieChoicePreferencesForm, { initial: null, disabled: false, onSubmit: () => {} }));
    expect(html).toContain(profileIntegrationCopy.pl.applied);
    expect(selected(html, "Komedia")).toBe(true);
    expect(selected(html, "Horror")).toBe(true);
    expect(selected(html, "Netflix")).toBe(true);
    expect(html).toContain('value="90" selected=""');
  });

  it("preserves submitted room settings over profile defaults, including intentionally empty selections", () => {
    mocks.defaults = { owner: "user_a", loading: false, preferences: saved, failed: false };
    const empty: MovieChoicePreferences = { genres: [], excludedGenres: [], providerIds: [], maxRuntime: null };
    const html = renderToStaticMarkup(createElement(MovieChoicePreferencesForm, { initial: empty, disabled: false, onSubmit: () => {} }));
    expect(html).not.toContain(profileIntegrationCopy.pl.applied);
    expect(selected(html, "Komedia")).toBe(false);
    expect(selected(html, "Netflix")).toBe(false);
  });

  it.each([135, 240])("displays a saved %s-minute limit rather than silently hiding the active constraint", (maxRuntime) => {
    mocks.defaults = { owner: "user_a", loading: false, preferences: { ...saved, maxRuntime }, failed: false };
    const solo = renderToStaticMarkup(createElement(SoloRecommendPage));
    const together = renderToStaticMarkup(createElement(MovieChoicePreferencesForm, { initial: null, disabled: false, onSubmit: () => {} }));
    for (const html of [solo, together]) expect(html).toContain(`value="${maxRuntime}" selected=""`);
  });

  it("waits before mounting editable controls so late defaults cannot replace user changes", () => {
    mocks.defaults = { owner: "user_a", loading: true, preferences: null, failed: false };
    const solo = renderToStaticMarkup(createElement(SoloRecommendPage));
    const together = renderToStaticMarkup(createElement(MovieChoicePreferencesForm, { initial: null, disabled: false, onSubmit: () => {} }));
    for (const html of [solo, together]) {
      expect(html).toContain(profileIntegrationCopy.pl.loading);
      expect(html).not.toContain("<form");
    }
    const resumed = renderToStaticMarkup(createElement(MovieChoicePreferencesForm, { initial: saved, disabled: false, onSubmit: () => {} }));
    expect(resumed).toContain("<form");
    expect(resumed).not.toContain(profileIntegrationCopy.pl.loading);
  });

  it("retains guest defaults and lets a signed-in user continue when profile loading fails", () => {
    const guest = renderToStaticMarkup(createElement(SoloRecommendPage));
    expect(guest).not.toContain(profileIntegrationCopy.pl.applied);
    expect(selected(guest, "Netflix")).toBe(false);
    mocks.defaults = { owner: "user_a", loading: false, preferences: null, failed: true };
    const unavailable = renderToStaticMarkup(createElement(SoloRecommendPage));
    expect(unavailable).toContain(profileIntegrationCopy.pl.unavailable);
    expect(unavailable).toContain("<form");
  });
});
