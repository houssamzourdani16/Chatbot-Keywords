import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

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

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        blacklisted: user.blacklisted,
      },
    });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
