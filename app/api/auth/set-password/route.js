import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ✅ Set (or change) the password for the currently authenticated user.
//    Used from the profile to give Google-only accounts a password.
export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { message: "Password is required", success: false },
        { status: 400 },
      );
    }

    // Same rules as registration.
    if (
      password.length < 10 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return NextResponse.json(
        {
          message:
            "Le mot de passe doit contenir au moins 10 caractères, avec une lettre majuscule et un chiffre.",
          success: false,
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // Authenticate the user from the Bearer token.
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated", success: false },
        { status: 401 },
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { message: "Not authenticated", success: false },
        { status: 401 },
      );
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 401 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.hasPassword = true;
    await user.save();

    return NextResponse.json({
      message: "Password set successfully",
      success: true,
      hasPassword: true,
    });
  } catch (error) {
    console.error("❌ Set password error:", error.message);
    return NextResponse.json(
      { message: "Failed to set password", success: false },
      { status: 500 },
    );
  }
}
