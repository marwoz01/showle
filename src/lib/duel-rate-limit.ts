import { checkRateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";

const budgets = {
  room: { global: 120, ip: 20 },
  state: { global: 6000, ip: 1200 },
  mutation: { global: 600, ip: 120 },
} as const;

export async function allowDuelRequest(request: Request, kind: keyof typeof budgets): Promise<boolean> {
  const budget = budgets[kind];
  // This fixed key cannot be rotated with either a player token or an IP header.
  if (!(await checkRateLimit(`duel-global:${kind}`, { limit: budget.global, windowMs: 60000 })).success) return false;
  if (!(await checkRateLimit(`duel-ip:${kind}:${requestIp(request)}`, { limit: budget.ip, windowMs: 60000 })).success) return false;
  if (kind !== "state") return true;
  const player = request.headers.get("x-duel-player") ?? "";
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(player)) return true;
  return (await checkRateLimit(`duel-state:${player}`, { limit: 120, windowMs: 60000 })).success;
}
