const SESSION_KEY = "showle:higher-lower:year:session:v1";
const BEST_KEY = "showle:higher-lower:year:best:v1";
export const HIGHER_LOWER_ACCOUNT_RESET_EVENT = "showle:higher-lower:account-reset";

export function higherLowerStorageKeys(userId: string | null | undefined) {
  const suffix = userId ? `:${userId}` : "";
  return { session: `${SESSION_KEY}${suffix}`, best: `${BEST_KEY}${suffix}` };
}

export function readHigherLowerBest(key: string) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch { return 0; }
}

export function clearHigherLowerAccountStorage(userId: string) {
  if (!userId) return;
  const keys = higherLowerStorageKeys(userId);
  try { localStorage.removeItem(keys.best); } catch { /* Optional storage. */ }
  try { sessionStorage.removeItem(keys.session); } catch { /* Optional storage. */ }
  window.dispatchEvent(new CustomEvent(HIGHER_LOWER_ACCOUNT_RESET_EVENT, { detail: userId }));
}
