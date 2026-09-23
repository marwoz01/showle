import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGemWallet } from "@/lib/gems";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getGemWallet(userId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load gem wallet", error);
    return NextResponse.json({ error: "Could not load wallet" }, { status: 500 });
  }
}
