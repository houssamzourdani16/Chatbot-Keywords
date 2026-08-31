// app/api/admin/google/spreadsheets/[id]/sheets/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { getSheets } from "@/lib/services/google-drive.service";

// GET - Get all sheets within a spreadsheet
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const connectionId = url.searchParams.get("connectionId") || "";

    const result = await getSheets(admin._id.toString(), id, connectionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sheets: result.sheets,
      spreadsheetId: result.spreadsheetId,
    });
  } catch (error) {
    console.error("Get sheets error:", error);
    return NextResponse.json(
      { error: "Failed to get sheets" },
      { status: 500 },
    );
  }
}
