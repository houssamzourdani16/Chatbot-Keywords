// app/api/admin/keywords/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Keyword from "@/lib/models/keyword";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - Single keyword
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const keyword = await Keyword.findById(id).lean();
    if (!keyword) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, keyword });
  } catch (error) {
    console.error("Admin keyword detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch keyword" },
      { status: 500 },
    );
  }
}

// PUT - Update keyword
export async function PUT(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const keyword = await Keyword.findById(id);
    if (!keyword) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    const allowed = [
      "keyword",
      "category",
      "language",
      "meaning",
      "synonyms",
      "context",
      "priority",
      "examples",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) keyword[key] = body[key];
    }

    await keyword.save();
    return NextResponse.json({ success: true, keyword });
  } catch (error) {
    console.error("Admin update keyword error:", error);
    return NextResponse.json(
      { error: "Failed to update keyword" },
      { status: 500 },
    );
  }
}

// DELETE - Delete keyword
export async function DELETE(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const keyword = await Keyword.findByIdAndDelete(id);
    if (!keyword) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Keyword deleted",
    });
  } catch (error) {
    console.error("Admin delete keyword error:", error);
    return NextResponse.json(
      { error: "Failed to delete keyword" },
      { status: 500 },
    );
  }
}
