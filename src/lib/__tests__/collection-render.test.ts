import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
const language = vi.hoisted(() => ({ locale: "pl" as "pl" | "en" }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.locale === "pl" ? pl : en, locale: language.locale }) }));
vi.mock("@/components/ui/icons", () => ({ Eye: () => null, Bookmark: () => null, Trophy: () => null, X: () => null }));
import CollectionTabs from "@/components/collection/CollectionTabs";
import ReviewModal from "@/components/collection/ReviewModal";
import ConfirmModal from "@/components/collection/ConfirmModal";
describe.each(["pl", "en"] as const)("accessible collection markup (%s)", (locale) => {
  it("labels every tab and exposes one selected tab to keyboard navigation", () => {
    language.locale = locale;
    const t = locale === "pl" ? pl : en;
    const html = renderToStaticMarkup(createElement(CollectionTabs, { id: "collection", active: "watchlist", onChange: vi.fn(), counts: { watched: 25, watchlist: 0, rankings: 2 } }));
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    for (const name of Object.values(t.collection.tabs)) expect(html).toContain(name);
    expect(html).not.toContain("hidden sm:inline");
    expect(html).toContain('aria-controls="collection-watchlist-panel"');
  });
  it("provides native named dialogs and a labelled bounded review input", () => {
    language.locale = locale;
    const review = renderToStaticMarkup(createElement(ReviewModal, { movieTitle: "Film", initialReview: "Draft", onSave: vi.fn(), onClose: vi.fn() }));
    expect(review).toContain("<dialog"); expect(review).toContain('aria-modal="true"');
    expect(review).toContain('aria-labelledby='); expect(review).toContain('maxLength="1000"');
    expect(review).toContain("<label"); expect(review).toContain(">Draft</textarea>");
    const confirm = renderToStaticMarkup(createElement(ConfirmModal, { message: "Confirm?", onConfirm: vi.fn(), onCancel: vi.fn() }));
    expect(confirm).toContain("<dialog"); expect(confirm).toContain('aria-labelledby='); expect(confirm).toContain('autofocus=""');
  });
});
