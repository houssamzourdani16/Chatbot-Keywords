// app/api/auth/google/route.js
import { NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  getGoogleOAuthConfig,
} from "@/lib/services/google-oauth";

// ✅ Start the "Sign in with Google" flow.
//    Redirects the user to Google's consent screen.
export async function GET(request) {
  const { clientId } = getGoogleOAuthConfig();
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 },
    );
  }

  // Optional: carry a state to know where to redirect after login.
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/dashboard";
  const state = Buffer.from(JSON.stringify({ redirectTo })).toString("base64");

  const authUrl = buildGoogleAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
