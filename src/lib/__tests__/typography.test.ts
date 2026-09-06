import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { normalizeDisplayText } from "@/lib/typography";
import { localizeCountry, localizeGenre } from "@/lib/localization";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import catalog from "@/data/frame-catalog.json";

const longDash = /[\u2010-\u2015\u2212]/;
describe("consistent display punctuation", () => {
  it.each(["\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2015", "\u2212"])(
    "replaces a typographic dash with an ordinary hyphen %#", (dash) => {
      expect(normalizeDisplayText(`Film ${dash} opis${dash}ciąg dalszy`)).toBe("Film - opis-ciąg dalszy");
    });
  it("preserves ordinary hyphens, dot separators, Polish text and line breaks", () => {
    const text = "Showle · Film dnia\nSpider-Man - Łódź, rok 2000-2026. 3-2-1";
    expect(normalizeDisplayText(text)).toBe(text);
    expect(normalizeDisplayText(undefined)).toBeUndefined();
    expect(normalizeDisplayText(null)).toBeNull();
    expect(normalizeDisplayText("")).toBe("");
  });
  it.each([pl, en])("uses a dot in browser/share titles and normalizes shared movie titles %#", (t) => {
    expect(t.meta.title).toMatch(/^Showle · /);
    expect(t.result.shareText("Film\u2014część II", 2, 7)).toContain("Film-część II");
    expect(t.result.shareText("Film\u2014część II", 2, 7)).not.toMatch(longDash);
  });
  it("normalizes display fallbacks from external genre/country data", () => {
    expect(localizeGenre("Drama\u2014romance", en)).toBe("Drama-romance");
    expect(localizeCountry("A\u2013B", undefined, "pl", "?")).toBe("A-B");
  });
  it("keeps the permanent frame catalog titles free of long dashes", () => {
    for (const movie of catalog.movies) {
      expect(movie.titles.pl).not.toMatch(longDash);
      expect(movie.titles.en).not.toMatch(longDash);
    }
  });
  it("has no long dashes in authored frontend string literals or JSX text", () => {
    const roots = ["src/components", "src/i18n", "src/app"];
    const failures: string[] = [];
    const inspect = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === "api") continue; // Server-only prompts aren't UI copy.
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) { inspect(file); continue; }
        if (!/\.tsx?$/.test(file)) continue;
        const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
        const visit = (node: ts.Node) => {
          if ((ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ||
            ts.isTemplateTail(node) || ts.isJsxText(node)) && longDash.test(node.text)) {
            failures.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    };
    roots.forEach(inspect);
    expect(failures).toEqual([]);
  });
});
