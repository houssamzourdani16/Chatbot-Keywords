// app/api/admin/google/connect/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { getAuthUrl } from "@/lib/services/google-drive.service";

// POST - Generate the Google OAuth authorization URL
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error:
            "Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to .env.local",
        },
        { status: 500 },
      );
    }

    // Optional accountId to re-connect a specific account
    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId || "";

    const url = getAuthUrl(admin._id.toString(), accountId);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Google connect error:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 },
    );
  }
}
