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

export async function copyDuelInvite(url: string, browser: InviteNavigator): Promise<"copied" | "manual"> {
  try {
    if (!browser.clipboard) return "manual";
    await browser.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual";
  }
}

export async function shareDuelInvite(
  url: string, title: string, browser: InviteNavigator,
): Promise<"shared" | "cancelled" | "copied" | "manual"> {
  try {
    if (!browser.share) return copyDuelInvite(url, browser);
    await browser.share({ title, url });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    return copyDuelInvite(url, browser);
  }
}
