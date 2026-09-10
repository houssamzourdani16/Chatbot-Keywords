// app/api/conversations-sheet/content/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { getSheetContent } from "@/lib/services/conversations-sheet.service";

// GET - Get the full content of a conversations sheet config
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Config id is required" },
        { status: 400 },
      );
    }

    const result = await getSheetContent(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get conversations sheet content error:", error);
    return NextResponse.json(
      { error: "Failed to get sheet content" },
      { status: 500 },
    );
  }
}
