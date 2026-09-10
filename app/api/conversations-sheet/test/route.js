// app/api/conversations-sheet/test/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { testConnection } from "@/lib/services/conversations-sheet.service";

// POST - Test the conversations sheet connection step-by-step
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const result = await testConnection(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test conversations sheet connection error:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 },
    );
  }
}
