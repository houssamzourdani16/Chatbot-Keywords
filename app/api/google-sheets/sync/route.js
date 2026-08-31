// app/api/google-sheets/sync/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { syncKeywords } from "@/lib/services/google-sheets-manual.service";

// POST - Sync keywords from the Google Sheet
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncKeywords();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync Google Sheets error:", error);
    return NextResponse.json(
      { error: "Failed to sync keywords" },
      { status: 500 },
    );
  }
}
