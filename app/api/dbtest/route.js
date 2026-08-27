import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    return NextResponse.json({
      message: "Database connection successful",
      success: true,
    });
  } catch (error) {
    return NextResponse.json({
      message: "Database connection failed",
      error : error.message,
      success: false,
    });
  }
}
