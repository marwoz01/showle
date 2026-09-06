import { NextRequest, NextResponse } from "next/server";
import { dailyResponse } from "@/lib/daily-api";

export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return dailyResponse(request);
}
export function POST(request: NextRequest) {
  return dailyResponse(request, true);
}
export function PUT() {
  return NextResponse.json(
    { error: "client_update_required" },
    { status: 409 },
  );
}
