// Run against a local Showle server. All app APIs are intercepted; no account or DB writes.
// Requires Playwright already installed, optionally via SHOWLE_PLAYWRIGHT_PACKAGE.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SHOWLE_PLAYWRIGHT_PACKAGE || "playwright");
const baseURL = process.env.SHOWLE_SMOKE_URL || "http://127.0.0.1:3017";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname), "Use an isolated local server");
const output = "test-results/browser-smoke";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, timeout: 30000, executablePath: process.env.SHOWLE_SMOKE_CHROMIUM || undefined });
const failures = [];
const contexts = [];
const movie = (id, title = `Film ${id}`) => ({ id, title, type: "movie", year: 2024, genres: ["Comedy"],
  country: "Poland", countryCode: "PL", director: "Director", leadActor: "Actor", runtime: 85,
  budget: 0, popularity: 20, rating: 7.5, posterPath: "", overview: "Opis filmu do testu interfejsu." });

async function setup(viewport, blockedStorage = false) {
  const context = await browser.newContext({ viewport, locale: "pl-PL", reducedMotion: "reduce" });
  contexts.push(context);
  if (blockedStorage) await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const state = { requests: [], mode: "ok", unhandled: [], errors: [] };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await context.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== new URL(baseURL).origin) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/recommend/picks") {
      const body = req.postDataJSON() ?? {};
      state.requests.push(body);
      if (state.mode === "error") return json({ error: "unavailable" }, 503);
      if (state.mode === "quota") return json({ error: "daily_limit_anon", remaining: 0, limit: 1 }, 429);
      const excluded = [...(body.exclude ?? []), ...(body.negativeIds ?? [])];
      const ids = Array.from({ length: 12 }, (_, n) => 100 + n).filter((id) => !excluded.includes(id)).slice(0, 3);
      return json({ recommendations: state.mode === "empty" ? [] : ids.map((id) => ({ movie: movie(id), justification: "Pasuje do Twojego gustu." })),
        meta: { mode: "personal", source: "catalog", matching: "filters", interpretation: "local", relevance: "local", personalized: Boolean(body.favoriteIds?.length), partial: false } });
    }
    if (url.pathname === "/api/movies/search") return json([{ id: 42, title: "Ulubiony film", originalTitle: "Ulubiony film", year: 2020, posterPath: "" }]);
    if (url.pathname === "/api/movies/details") return json(movie(Number(url.searchParams.get("id")), "Ulubiony film"));
    if (url.pathname === "/api/movies/watch-providers") return json({ flatrate: [], rent: [], link: null });
    if (url.pathname === "/api/game/state") return json(null);
    state.unhandled.push(`${req.method()} ${url.pathname}`);
    return json({ error: "unexpected_smoke_api" }, 501);
  });
  return { page, state };
}

async function cards(page, count = 3) { await page.waitForFunction((n) => document.querySelectorAll("article").length === n, count); }
async function overflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, "Horizontal overflow");
}
async function scenario(name, task) {
  try { await task(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
  await scenario("guest onboarding, persisted services, feedback and runtime", async () => {
    const { page, state } = await setup({ width: 1280, height: 900 });
    await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByRole("heading", { name: "Zacznijmy od Twojego gustu" }).waitFor();
    await page.getByRole("combobox", { name: "Wyszukaj film, który lubisz…" }).fill("Ulubiony");
    await page.getByRole("option", { name: /Ulubiony film/ }).click();
    await page.getByRole("button", { name: "Netflix", exact: true }).click();
    await page.getByRole("button", { name: "Zapisz i pokaż filmy" }).click();
    await cards(page);
    assert.deepEqual(state.requests.at(-1).favoriteIds, [42]);
    assert.deepEqual(state.requests.at(-1).providerIds, [8]);
    assert.ok(await page.getByRole("button", { name: /Zaloguj.*zapis/i }).count() >= 3);
    await overflow(page);
    await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
    await page.reload(); await cards(page);
    assert.equal(await page.getByRole("heading", { name: "Zacznijmy od Twojego gustu" }).count(), 0);
    assert.deepEqual(state.requests.at(-1).favoriteIds, [42]);
    await page.locator("article").first().getByRole("button", { name: "Nie dla mnie", exact: true }).click();
    await page.getByRole("button", { name: "Pokaż inne", exact: true }).click(); await cards(page);
    assert.ok(state.requests.at(-1).negativeIds.includes(100));
    assert.deepEqual(state.requests.at(-1).exclude, [100, 101, 102]);
    await page.getByRole("button", { name: "Do 90 minut", exact: true }).click();
    await page.getByRole("button", { name: "Dopasuj propozycje", exact: true }).click(); await cards(page);
    assert.equal(state.requests.at(-1).maxRuntime, 90);
    assert.equal(state.requests.at(-1).freeformText, "");
    assert.deepEqual(state.errors, []); assert.deepEqual(state.unhandled, []);
  });
  await scenario("mobile onboarding, empty results, retry, quota and English", async () => {
    const { page, state } = await setup({ width: 390, height: 844 });
    await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByRole("button", { name: "Pokaż popularne filmy", exact: true }).click(); await cards(page);
    await overflow(page);
    await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 320, height: 700 }); await overflow(page);
    state.mode = "empty";
    await page.getByRole("button", { name: "Pokaż inne", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Nie znaleźliśmy filmu" }).waitFor();
    state.mode = "error";
    await page.getByRole("button", { name: "Spróbuj ponownie", exact: true }).click();
    await page.getByRole("alert").waitFor();
    state.mode = "ok";
    await page.getByRole("button", { name: "Spróbuj ponownie", exact: true }).click(); await cards(page);
    state.mode = "quota";
    await page.getByLabel("Na co masz dziś ochotę?").fill("Komedia");
    await page.getByRole("button", { name: "Dopasuj propozycje", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Zaloguj się, aby uzyskać więcej rekomendacji" }).waitFor();
    state.mode = "ok";
    await page.evaluate(() => { localStorage.setItem("showle-locale", "en"); document.cookie = "showle-locale=en; path=/; samesite=lax"; });
    await page.reload(); await cards(page);
    await page.getByRole("heading", { name: "What will you watch tonight?" }).waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await overflow(page);
    assert.deepEqual(state.errors, []); assert.deepEqual(state.unhandled, []);
  });
  await scenario("blocked browser storage has usable session-only fallback", async () => {
    const { page, state } = await setup({ width: 390, height: 844 }, true);
    await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByRole("button", { name: "Pokaż popularne filmy", exact: true }).click(); await cards(page);
    await page.getByText("Przeglądarka nie pozwala zapisać preferencji.", { exact: false }).waitFor();
    assert.deepEqual(state.errors, []); assert.deepEqual(state.unhandled, []);
  });
} finally {
  await Promise.all(contexts.map((context) => context.close()));
  await browser.close();
}
if (failures.length) process.exitCode = 1;
