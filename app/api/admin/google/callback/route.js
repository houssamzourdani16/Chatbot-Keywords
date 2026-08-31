// app/api/admin/google/callback/route.js
import { NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/services/google-drive.service";

// Use the ACTUAL host the request came in on (never localhost in production),
// falling back to NEXT_PUBLIC_APP_URL for non-web hosts.
function getBaseUrl(request) {
  try {
    const origin = new URL(request.url).origin;
    if (origin && origin !== "http://localhost:3000") return origin;
  } catch (e) {
    // ignore
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// GET - Handle the Google OAuth callback
export async function GET(request) {
  const baseUrl = getBaseUrl(request);
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/admin/keywords?google=error&reason=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/admin/keywords?google=error&reason=missing_code`,
      );
    }

    const info = await handleOAuthCallback(code, state);

    return NextResponse.redirect(
      `${baseUrl}/admin/keywords?google=success&email=${encodeURIComponent(info.email || "")}`,
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/admin/keywords?google=error&reason=${encodeURIComponent(error.message)}`,
    );
  }
}
