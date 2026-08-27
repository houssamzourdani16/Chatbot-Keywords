import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (!refreshToken) {
      return NextResponse.json(
        {
          message: "No refresh Token Provides",
          success: false,
        },
        {
          status: 400,
        },
      );
    }
    await dbConnect();
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return NextResponse.json(
        {
          message: "Invalid or expired refresh token",
          success: false,
        },
        {
          status: 401,
        },
      );
    }
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: refreshToken,
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "Invalid refresh token",
          success: false,
        },
        {
          status: 401,
        },
      );
    }
    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );
    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to refresh token",
        error: error.message,
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}
