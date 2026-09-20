import { copyDuelInvite } from "@/lib/duel-invite";

interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, "writeText">;
}

export async function shareResultText(text: string, browser: ShareNavigator): Promise<"shared" | "cancelled" | "copied" | "manual"> {
  if (browser.share) {
    try { await browser.share({ title: "Showle", text }); return "shared"; }
    catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled";
    }
  }
  return copyDuelInvite(text, browser);
}
