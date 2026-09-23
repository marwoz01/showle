import type { GuessResult, MediaDetails } from "@/types";

const UNKNOWN_NAMES = new Set(["", "unknown", "n/a", "nieznany", "nieznana", "brak danych", "-"]);

export function normalizeCastName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function knownCastNames(names: readonly string[] | undefined): string[] {
  return [...new Set((names ?? []).map(normalizeCastName).filter((name) => !UNKNOWN_NAMES.has(name)))];
}

export function compareGuessCast(
  guess: Pick<MediaDetails, "cast" | "leadActor">,
  answer: Pick<MediaDetails, "cast" | "leadActor">,
  fullAnswerCast?: readonly string[],
): NonNullable<GuessResult["castComparison"]> {
  const completeCast = knownCastNames(fullAnswerCast);
  const answerNames = new Set([
    ...completeCast,
    ...knownCastNames([answer.leadActor, ...(answer.cast ?? []).map(({ name }) => name)]),
  ]);
  const seen = new Set<string>();
  return [guess.leadActor, ...(guess.cast ?? []).map(({ name }) => name)].flatMap<NonNullable<GuessResult["castComparison"]>[number]>((name) => {
    const key = normalizeCastName(name);
    if (UNKNOWN_NAMES.has(key) || seen.has(key)) return [];
    seen.add(key);
    if (answerNames.has(key)) return [{ name, status: "exact" as const }];
    // A truncated or unavailable answer cast can prove a match, never an absence.
    return completeCast.length ? [{ name, status: "miss" as const }] : [];
  });
}
