// app/api/admin/google/spreadsheets/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { listSpreadsheets } from "@/lib/services/google-drive.service";

// GET - List spreadsheets from Google Drive (optional ?q= search)
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const connectionId = url.searchParams.get("connectionId") || "";

    const result = await listSpreadsheets(
      admin._id.toString(),
      query,
      connectionId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, files: result.files });
  } catch (error) {
    console.error("List spreadsheets error:", error);
    return NextResponse.json(
      { error: "Failed to list spreadsheets" },
      { status: 500 },
    );
  }
}
