import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import bcrypt from "bcryptjs";

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
    });

    return NextResponse.json(
      {
        message: "User registred successfuly",
        success: true,
        data: {
          id: newuser._id,
          name: newuser.name,
          email: newuser.email,
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
