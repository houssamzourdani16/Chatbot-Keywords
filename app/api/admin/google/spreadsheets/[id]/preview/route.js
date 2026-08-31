// app/api/admin/google/spreadsheets/[id]/preview/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { previewSheet } from "@/lib/services/google-drive.service";

// GET - Preview data from a specific sheet (?sheet=Sheet1)
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const sheetName = url.searchParams.get("sheet") || "Sheet1";
    const connectionId = url.searchParams.get("connectionId") || "";

    const result = await previewSheet(
      admin._id.toString(),
      id,
      sheetName,
      connectionId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      headers: result.headers,
      data: result.data,
      totalRows: result.totalRows,
      previewRows: result.previewRows,
      columns: result.columns,
    });
  } catch (error) {
    console.error("Preview sheet error:", error);
    return NextResponse.json(
      { error: "Failed to preview sheet" },
      { status: 500 },
    );
  }
}
