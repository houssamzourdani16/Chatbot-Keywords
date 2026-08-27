import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";

export async function POST(request) {
  try {
    // 1. Get Refresh Token from cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          message: "No refresh token provided",
          success: false,
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // 2. Remove Refresh Token from database
    await User.findOneAndUpdate(
      { refreshToken: refreshToken },
      { refreshToken: null },
    );

    // 3. Clear the cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to logout",
        error: error.message,
        success: false,
      },
      { status: 500 },
    );
  }
}
