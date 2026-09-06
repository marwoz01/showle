/** Normalize display copy without changing stored movie data or user input. */
export function normalizeDisplayText(text: string): string;
export function normalizeDisplayText(text: string | undefined): string | undefined;
export function normalizeDisplayText(text: string | null | undefined): string | null | undefined;
export function normalizeDisplayText(text: string | null | undefined): string | null | undefined {
  return text?.replace(/[\u2010-\u2015\u2212]/g, "-") ?? text;
}
