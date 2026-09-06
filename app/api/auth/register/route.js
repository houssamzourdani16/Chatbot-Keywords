import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import bcrypt from "bcryptjs";

// ✅ Generate a unique Facebook/Meta webhook verify token for a user.
//    This token is personal to the user and can be used on ALL their
//    products while configuring the webhook in the Meta dashboard.
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

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          message: "Name, email and password are required",
          success: false,
        },
        { status: 400 },
      );
    }
    const [user] = await Promise.all([User.findOne({ email }), dbConnect()]);
    if (user) {
      return NextResponse.json(
        {
          message: "User already exists. Please login instead",
          success: false,
        },
        { status: 409 },
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newuser = await User.create({
      name,
      email,
      password: hashedPassword,
      verifyToken: generateVerifyToken(),
      hasPassword: true,
    });

    return NextResponse.json(
      {
        message: "User registred successfuly",
        success: true,
        data: {
          id: newuser._id,
          name: newuser.name,
          email: newuser.email,
          verifyToken: newuser.verifyToken,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "registration failed",
        error: error.message,
        success: false,
      },
      { status: 500 },
    );
  }
}
