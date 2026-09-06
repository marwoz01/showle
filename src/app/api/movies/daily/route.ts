import { NextRequest } from "next/server";
import { dailyResponse } from "@/lib/daily-api";

export const dynamic = "force-dynamic";
// Never expose the daily answer before the player's game is complete.
export function GET(request: NextRequest) { return dailyResponse(request); }
