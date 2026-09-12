// app/api/admin/unfound-keywords/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import {
  getUnfoundKeywords,
  deleteUnfoundKeyword,
  deleteManyUnfoundKeywords,
  updateUnfoundKeyword,
} from "@/lib/services/unfound-keyword.service";

// GET - List unfound keywords (with filters + pagination)
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const result = await getUnfoundKeywords({ page, limit, search, status });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("❌ Get unfound keywords error:", error.message);
    return NextResponse.json(
      { error: "Failed to load unfound keywords" },
      { status: 500 },
    );
  }
}

// DELETE - Delete one or more unfound keywords
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No keyword ids provided" },
        { status: 400 },
      );
    }

    if (ids.length === 1) {
      await deleteUnfoundKeyword(ids[0]);
    } else {
      await deleteManyUnfoundKeywords(ids);
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("❌ Delete unfound keywords error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete unfound keywords" },
      { status: 500 },
    );
  }
}

// PATCH - Update an unfound keyword (status, notes)
export async function PATCH(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updated = await updateUnfoundKeyword(id, { status, notes });
    if (!updated) {
      return NextResponse.json(
        { error: "Keyword not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, keyword: updated });
  } catch (error) {
    console.error("❌ Update unfound keyword error:", error.message);
    return NextResponse.json(
      { error: "Failed to update unfound keyword" },
      { status: 500 },
    );
  }
}