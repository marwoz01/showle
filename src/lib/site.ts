export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials");
  }
  return url.origin;
}
