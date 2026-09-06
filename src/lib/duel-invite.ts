export type DuelInvitation =
  | { status: "none" | "invalid" }
  | { status: "valid"; code: string };

export const NO_DUEL_INVITATION: DuelInvitation = { status: "none" };

export function parseDuelInvitation(value: string | string[] | undefined): DuelInvitation {
  if (value === undefined) return NO_DUEL_INVITATION;
  if (typeof value !== "string") return { status: "invalid" };
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? { status: "valid", code } : { status: "invalid" };
}

export function getDuelResumeCode(invitation: DuelInvitation, savedCode: string | null): string | null {
  const saved = parseDuelInvitation(savedCode ?? undefined);
  if (saved.status !== "valid" || invitation.status === "invalid") return null;
  if (invitation.status === "valid" && invitation.code !== saved.code) return null;
  return saved.code;
}

export function buildDuelInviteUrl(origin: string, roomCode: string): string {
  const invitation = parseDuelInvitation(roomCode);
  if (invitation.status !== "valid") throw new Error("invalid_code");
  const url = new URL("/play/duel", origin);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid_origin");
  url.searchParams.set("code", invitation.code);
  return url.toString();
}

interface InviteNavigator {
  clipboard?: Pick<Clipboard, "writeText">;
  share?: (data: ShareData) => Promise<void>;
}

export const INVITE_COPY_TIMEOUT_MS = 2000;
type CopyFallback = () => boolean;

export async function copyDuelInvite(
  url: string, browser: InviteNavigator, fallback?: CopyFallback, preferFallback = false,
): Promise<"copied" | "manual"> {
  let fallbackAttempted = false;
  const tryFallback = () => {
    if (fallbackAttempted) return false;
    fallbackAttempted = true;
    try { return fallback?.() === true; } catch { return false; }
  };
  // Touch browsers can lose the copy gesture after an asynchronous rejection.
  if (preferFallback && tryFallback()) return "copied";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (browser.clipboard) {
      // Start the write inside the tap handler, before any asynchronous work.
      const write = browser.clipboard.writeText(url);
      await Promise.race([write, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("clipboard_timeout")), INVITE_COPY_TIMEOUT_MS);
      })]);
      return "copied";
    }
  } catch { /* WebViews and non-HTTPS mobile previews may block the modern API. */ }
  finally { clearTimeout(timer); }
  return tryFallback() ? "copied" : "manual";
}

export async function shareDuelInvite(
  url: string, title: string, browser: InviteNavigator, fallback?: CopyFallback,
): Promise<"shared" | "cancelled" | "copied" | "manual"> {
  try {
    if (!browser.share) return copyDuelInvite(url, browser, fallback);
    await browser.share({ title, url });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    return copyDuelInvite(url, browser, fallback);
  }
}
