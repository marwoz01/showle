import { isIP } from "node:net";
import { rateLimit } from "@/lib/rate-limit";

const budgets = {
  room: { global: 120, ip: 20 },
  state: { global: 6000, ip: 240 },
  mutation: { global: 600, ip: 120 },
} as const;

/** Per-process load shedding; deployment-wide protection still belongs at the edge. */
export function allowDuelRequest(request: Request, kind: keyof typeof budgets): boolean {
  const budget = budgets[kind];
  // This fixed key cannot be rotated with either a player token or an IP header.
  if (!rateLimit(`duel-global:${kind}`, { limit: budget.global, windowMs: 60000 }).success) return false;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0].trim() ?? "";
  // Only trust forwarded IPs when the deployment proxy overwrites the header.
  const ip = forwarded.length <= 64 && isIP(forwarded) ? forwarded : "unknown";
  return rateLimit(`duel-ip:${kind}:${ip}`, { limit: budget.ip, windowMs: 60000 }).success;
}
