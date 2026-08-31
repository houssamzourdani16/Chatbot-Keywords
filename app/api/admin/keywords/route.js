// app/api/admin/keywords/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Keyword from "@/lib/models/keyword";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - List keywords with search, filter, pagination
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const language = searchParams.get("language") || "";
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { keyword: { $regex: search, $options: "i" } },
        { meaning: { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.category = category;
    if (language) query.language = language;

    const [keywords, total] = await Promise.all([
      Keyword.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Keyword.countDocuments(query),
    ]);

    const enriched = keywords.map((k) => ({
      id: k._id,
      keyword: k.keyword,
      category: k.category,
      language: k.language,
      meaning: k.meaning,
      synonyms: k.synonyms,
      context: k.context,
      priority: k.priority,
      examples: k.examples,
      createdAt: k.createdAt,
    }));

    return NextResponse.json({
      success: true,
      keywords: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin keywords error:", error);
    return NextResponse.json(
      { error: "Failed to fetch keywords" },
      { status: 500 },
    );
  }
}

// POST - Create a keyword
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    if (!body.keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 },
      );
    }

    const keyword = await Keyword.create({
      keyword: body.keyword,
      category: body.category || "Other",
      language: body.language || "Darija",
      meaning: body.meaning || "",
      synonyms: body.synonyms || [],
      context: body.context || "",
      priority: body.priority || "Medium",
      examples: body.examples || [],
    });

    return NextResponse.json({ success: true, keyword }, { status: 201 });
  } catch (error) {
    console.error("Admin create keyword error:", error);
    return NextResponse.json(
      { error: "Failed to create keyword" },
      { status: 500 },
    );
  }
}
