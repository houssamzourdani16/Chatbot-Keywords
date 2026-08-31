// app/api/keyword-lists/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import KeywordList from "@/lib/models/keyword-list";
import jwt from "jsonwebtoken";

// GET - Fetch all active keyword lists for authenticated users
export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token is valid
    jwt.verify(token, process.env.JWT_SECRET);

    // Only return ACTIVE keyword lists
    const lists = await KeywordList.find({ is_active: true })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = lists.map((l) => ({
      id: l._id,
      name: l.name,
      description: l.description,
      language: l.language,
      dialect: l.dialect,
      stats: l.stats,
    }));

    return NextResponse.json({ success: true, lists: enriched });
  } catch (error) {
    console.error("Fetch keyword lists error:", error);
    return NextResponse.json(
      { error: "Failed to fetch keyword lists" },
      { status: 500 },
    );
  }
}