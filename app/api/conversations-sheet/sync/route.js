// app/api/conversations-sheet/sync/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { syncConversations } from "@/lib/services/conversations-sheet.service";

// POST - Sync all conversations sheets and update stats
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncConversations();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync conversations sheets error:", error);
    return NextResponse.json(
      { error: "Failed to sync conversations sheets" },
      { status: 500 },
    );
  }
}
