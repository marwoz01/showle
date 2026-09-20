import { isIP } from "node:net";

/** The origin must only accept traffic from the proxy that replaces this header. */
export function requestIp(request: Request): string {
  const trusted = process.env.VERCEL === "1" || process.env.TRUSTED_PROXY === "vercel"
    || process.env.TRUSTED_PROXY === "forwarded";
  if (!trusted) return "unknown";
  // Vercel overwrites X-Forwarded-For. Reject lists instead of trusting their first entry.
  const value = request.headers.get("x-forwarded-for")?.trim() ?? "";
  if (value.length > 64 || value.includes("%") || !isIP(value)) return "unknown";
  if (isIP(value) === 6) return new URL(`http://[${value}]/`).hostname.slice(1, -1);
  return value;
}
