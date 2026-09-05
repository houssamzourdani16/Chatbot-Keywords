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

    const user = await User.findById(decoded.userId).select(
      "-password -refreshToken",
    );

    if (!user) {
      return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }

    // ✅ Backfill/ensure a per-user verify token exists
    await ensureVerifyToken(user);

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
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
