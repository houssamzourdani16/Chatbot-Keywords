// app/api/admin/keyword-lists/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import KeywordList from "@/lib/models/keyword-list";
import { verifyAdmin } from "@/lib/auth/admin";
import {
  testKeywordListConnection,
  syncKeywordList,
  getKeywordsForList,
} from "@/lib/services/keyword-list-service";

// GET - Single keyword list
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const list = await KeywordList.findById(id).lean();
    if (!list) {
      return NextResponse.json(
        { error: "Keyword list not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error("Admin keyword list detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch keyword list" },
      { status: 500 },
    );
  }
}

// PUT - Update keyword list
export async function PUT(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const list = await KeywordList.findById(id);
    if (!list) {
      return NextResponse.json(
        { error: "Keyword list not found" },
        { status: 404 },
      );
    }

    // Update basic fields
    if (body.name) list.name = body.name;
    if (body.description !== undefined) list.description = body.description;
    if (body.language) list.language = body.language;
    if (body.dialect) list.dialect = body.dialect;
    if (body.is_active !== undefined) list.is_active = body.is_active;

    // Update google sheets config
    if (body.google_sheets) {
      const gs = body.google_sheets;
      if (gs.sheet_id) list.google_sheets.sheet_id = gs.sheet_id;
      if (gs.sheet_name) list.google_sheets.sheet_name = gs.sheet_name;
      if (gs.range) list.google_sheets.range = gs.range;
      if (gs.service_account_email)
        list.google_sheets.service_account_email = gs.service_account_email;
      if (gs.private_key) list.google_sheets.private_key = gs.private_key;
      if (gs.api_key !== undefined) list.google_sheets.api_key = gs.api_key;
      if (gs.google_connection_id !== undefined)
        list.google_sheets.google_connection_id = gs.google_connection_id;
      if (gs.columns) {
        if (gs.columns.keyword_column !== undefined)
          list.google_sheets.columns.keyword_column = gs.columns.keyword_column;
        if (gs.columns.category_column !== undefined)
          list.google_sheets.columns.category_column =
            gs.columns.category_column;
        if (gs.columns.metadata_columns)
          list.google_sheets.columns.metadata_columns =
            gs.columns.metadata_columns;
      }
    }

    // Update cache settings
    if (body.cache) {
      if (body.cache.enabled !== undefined)
        list.cache.enabled = body.cache.enabled;
      if (body.cache.ttl) list.cache.ttl = body.cache.ttl;
    }

    await list.save();
    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error("Admin update keyword list error:", error);
    return NextResponse.json(
      { error: "Failed to update keyword list" },
      { status: 500 },
    );
  }
}

// DELETE - Delete keyword list
export async function DELETE(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const list = await KeywordList.findByIdAndDelete(id);
    if (!list) {
      return NextResponse.json(
        { error: "Keyword list not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Keyword list deleted",
    });
  } catch (error) {
    console.error("Admin delete keyword list error:", error);
    return NextResponse.json(
      { error: "Failed to delete keyword list" },
      { status: 500 },
    );
  }
}

// POST - Test connection / Sync / Get keywords
export async function POST(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const action = body.action || "test";

    const list = await KeywordList.findById(id);
    if (!list) {
      return NextResponse.json(
        { error: "Keyword list not found" },
        { status: 404 },
      );
    }

    if (action === "test") {
      const result = await testKeywordListConnection(list);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sync") {
      const result = await syncKeywordList(id);
      return NextResponse.json(result);
    }

    if (action === "keywords") {
      const result = await getKeywordsForList(id, {
        forceRefresh: body.forceRefresh,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin keyword list action error:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 },
    );
  }
}
