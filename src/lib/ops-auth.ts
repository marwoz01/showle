import { createHash, timingSafeEqual } from "node:crypto";

export function isOpsRequest(request: Request): boolean {
  const secret = process.env.OPS_SECRET;
  if (!secret || secret.length < 32) return false;
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.length > 512 || !authorization.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization.slice(7)), digest(secret));
}
