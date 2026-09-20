import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import type { MediaDetails } from "@/types";

const context = vi.hoisted(() => ({ locale: "pl", signedIn: false, ready: true, status: null as "watchlist" | null }));
const writes = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: context.locale === "pl" ? pl : en, locale: context.locale }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/play/movie" }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: context.signedIn ? { id: "user_one" } : null, isLoaded: context.ready }),
  SignInButton: ({ children, mode, fallbackRedirectUrl }: { children: ReactNode; mode: string; fallbackRedirectUrl: string }) =>
    createElement("div", { "data-mode": mode, "data-return": fallbackRedirectUrl }, children) }));
vi.mock("@/components/ui/icons", () => ({ Bookmark: () => null, BookmarkCheck: () => null, Eye: () => null, Loader2: () => null }));
vi.mock("@/components/providers/CollectionProvider", () => ({ useCollectionStatus: () => ({ status: context.status, retry: vi.fn() }) }));
vi.mock("@/lib/collection-client", () => ({ collectionRequest: writes.request, collectionChanged: vi.fn() }));
import SaveMovieButton from "@/components/collection/SaveMovieButton";

const movie: MediaDetails = { id: 603, type: "movie", title: "The Matrix", genres: [], year: 1999, country: "US",
  director: "", leadActor: "", runtime: 136, budget: 1, popularity: 1, rating: 8, posterPath: "", overview: "" };

describe("guest collection conversion", () => {
  it.each(["pl", "en"])("exposes a localized modal sign-in action instead of hiding save (%s)", (locale) => {
    context.locale = locale; context.signedIn = false; context.ready = true;
    const t = locale === "pl" ? pl : en;
    const html = renderToStaticMarkup(createElement(SaveMovieButton, { movie, variant: "button" }));
    expect(html).toContain(t.collection.signInToSave);
    expect(html).toContain('data-mode="modal"');
    expect(html).toContain('data-return="/play/movie"');
    expect(html).not.toContain('disabled=""');
    expect(writes.request).not.toHaveBeenCalled();
  });
  it("waits for the authentication state before opening a modal", () => {
    context.signedIn = false; context.ready = false;
    expect(renderToStaticMarkup(createElement(SaveMovieButton, { movie }))).toContain('disabled=""');
  });
  it("keeps the existing account save flow and already-saved state", () => {
    context.locale = "en"; context.signedIn = true; context.ready = true; context.status = null;
    const unsaved = renderToStaticMarkup(createElement(SaveMovieButton, { movie, variant: "button" }));
    expect(unsaved).toContain(en.collection.addToCollection);
    expect(unsaved).not.toContain("data-mode");
    context.status = "watchlist";
    const saved = renderToStaticMarkup(createElement(SaveMovieButton, { movie, variant: "button" }));
    expect(saved).toContain(en.collection.alreadySaved);
    expect(saved).not.toContain("<button");
    expect(writes.request).not.toHaveBeenCalled();
  });
});
