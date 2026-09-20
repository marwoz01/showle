import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { clearAccountData } from "@/lib/account-data";
import { reportServerError } from "@/lib/server-error";

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let event;
  try { event = await verifyWebhook(request); }
  catch { return NextResponse.json({ error: "invalid_signature" }, { status: 400 }); }
  if (event.type !== "user.deleted") return NextResponse.json({ ok: true });
  if (!event.data.id || !/^user_[A-Za-z0-9_-]+$/.test(event.data.id)) {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }
  try {
    await clearAccountData(event.data.id, true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const requestId = reportServerError("clerk_user_deleted", error);
    // A 5xx response asks Clerk to retry. Never acknowledge uncommitted cleanup.
    return NextResponse.json({ error: "unavailable", requestId }, { status: 503 });
  }
}
