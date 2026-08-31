// app/api/admin/google/callback/route.js
import { NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/services/google-drive.service";

// GET - Handle the Google OAuth callback
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/keywords?google=error&reason=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/keywords?google=error&reason=missing_code`,
      );
    }

    const info = await handleOAuthCallback(code, state);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/keywords?google=success&email=${encodeURIComponent(info.email || "")}`,
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/keywords?google=error&reason=${encodeURIComponent(error.message)}`,
    );
  }
}
