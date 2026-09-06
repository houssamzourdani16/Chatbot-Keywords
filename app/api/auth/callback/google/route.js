// app/api/auth/callback/google/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";
import {
  exchangeCodeForTokens,
  fetchGoogleProfile,
} from "@/lib/services/google-oauth";

// ✅ Generate a unique Facebook/Meta webhook verify token for a user.
function generateVerifyToken() {
  return (
    "vt_" +
    Array.from({ length: 24 }, () =>
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
        Math.floor(Math.random() * 62),
      ),
    ).join("")
  );
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login?error=google_failed`,
      );
    }

    // Decode the redirect target from state (default /dashboard).
    let redirectTo = "/dashboard";
    if (state) {
      try {
        const parsed = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8"),
        );
        redirectTo = parsed.redirectTo || "/dashboard";
      } catch (e) {
        // ignore malformed state
      }
    }

    // Exchange code for tokens, then fetch the Google profile.
    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokens.access_token);

    const email = profile.email;
    const name = profile.name || profile.given_name || email?.split("@")[0];

    if (!email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login?error=google_no_email`,
      );
    }

    await dbConnect();

    // Find or create the user by email.
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        // Google users have no password; store a random unusable hash.
        password: `google_${Buffer.from(email).toString("base64")}`,
        verifyToken: generateVerifyToken(),
        // ✅ Google-only accounts have no usable password yet.
        hasPassword: false,
      });
    }

    // Issue access + refresh tokens (same as email login).
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    user.refreshToken = refreshToken;
    await user.save();

    // Redirect to the app with the token in the URL fragment.
    // The login page reads it and stores it in localStorage.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/login?google_token=${accessToken}&redirect=${encodeURIComponent(redirectTo)}`,
    );
  } catch (error) {
    console.error("❌ Google callback error:", error.message);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }
}
