import { NextRequest } from "next/server";
import { dailyResponse } from "@/lib/daily-api";

// Compatibility route: the server accepts an action, never a client-supplied result.
export function POST(request: NextRequest) {
  return dailyResponse(request, true);
}
