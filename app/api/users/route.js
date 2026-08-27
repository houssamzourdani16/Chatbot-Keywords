import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find({}).lean();
    return NextResponse.json({
      message: "Users retrieved successfully",
      data: users,
      success: true,
      count: users.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to retrieve users",
        error: error.message,
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        {
          message: "Missing required fields",
          success: false,
        },
        { status: 400 },
      );
    }
    await dbConnect();
    const newUser = await User.create(body);
    return NextResponse.json(
      {
        message: "User created successfully",
        data: newUser,
        success: true,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          message: "Email already exists",
          success: false,
        },
        { status: 400 },
      );
    }
  }
}
