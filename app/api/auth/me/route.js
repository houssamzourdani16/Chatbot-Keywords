import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

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

// ✅ Ensure the user has a verify token (backfills existing users).
async function ensureVerifyToken(user) {
  if (!user.verifyToken) {
    user.verifyToken = generateVerifyToken();
    await user.save();
  }
  return user;
}

export async function GET(request) {
  try {
    await dbConnect();

    // ✅ Check BOTH: Authorization header AND cookie
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.split(" ")[1];
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Try accessToken first, then refreshToken
    const token = accessToken || refreshToken;

    if (!token) {
      return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }

    // Try to verify with JWT_SECRET (for accessToken)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // If accessToken failed, try refreshToken
      try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      } catch (refreshError) {
        return NextResponse.json({ isAuthenticated: false }, { status: 401 });
      }
    }

    const user = await User.findById(decoded.userId).select("-refreshToken");

    if (!user) {
      return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }

    // ✅ Backfill/ensure a per-user verify token exists
    await ensureVerifyToken(user);

    // ✅ Determine whether the user has a REAL (usable) password.
    //    Google-only accounts get a `google_...` placeholder hash, which is
    //    NOT a valid login password. A bcrypt hash always starts with `$2`.
    //    This is derived from the actual DB value, so it's correct even for
    //    legacy users that were created before the `hasPassword` field.
    const hasRealPassword =
      typeof user.password === "string" &&
      (user.password.startsWith("$2") ||
        (user.hasPassword === true && !user.password.startsWith("google_")));

    // Backfill the flag for this user so future reads are fast.
    if (user.hasPassword !== hasRealPassword) {
      user.hasPassword = hasRealPassword;
      await user.save();
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        blacklisted: user.blacklisted,
        verifyToken: user.verifyToken,
        hasPassword: hasRealPassword,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
