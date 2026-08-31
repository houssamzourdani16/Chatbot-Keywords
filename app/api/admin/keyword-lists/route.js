// app/api/admin/keyword-lists/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import KeywordList from "@/lib/models/keyword-list";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - List all keyword lists
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const lists = await KeywordList.find({}).sort({ createdAt: -1 }).lean();

    const enriched = lists.map((l) => ({
      id: l._id,
      name: l.name,
      description: l.description,
      language: l.language,
      dialect: l.dialect,
      is_active: l.is_active,
      google_sheets: {
        sheet_id: l.google_sheets?.sheet_id,
        sheet_name: l.google_sheets?.sheet_name,
        range: l.google_sheets?.range,
        service_account_email: l.google_sheets?.service_account_email,
        connection_status: l.google_sheets?.connection_status,
        connection_error: l.google_sheets?.connection_error,
      },
      cache: l.cache,
      stats: l.stats,
      sync_status: l.sync_status,
      sync_error: l.sync_error,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
    }));

    return NextResponse.json({ success: true, lists: enriched });
  } catch (error) {
    console.error("Admin keyword lists error:", error);
    return NextResponse.json(
      { error: "Failed to fetch keyword lists" },
      { status: 500 },
    );
  }
}

// POST - Create a keyword list
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    if (!body.name || !body.google_sheets?.sheet_id) {
      return NextResponse.json(
        { error: "Name and Sheet ID are required" },
        { status: 400 },
      );
    }

    const list = await KeywordList.create({
      name: body.name,
      description: body.description || "",
      language: body.language || "darija",
      dialect: body.dialect || "algerian",
      is_active: body.is_active !== undefined ? body.is_active : true,
      google_sheets: {
        sheet_id: body.google_sheets.sheet_id,
        sheet_name: body.google_sheets.sheet_name || "Sheet1",
        range: body.google_sheets.range || "A:B",
        api_key: body.google_sheets.api_key || "",
        service_account_email: body.google_sheets.service_account_email || "",
        private_key: body.google_sheets.private_key || "",
        google_connection_id: body.google_sheets.google_connection_id || null,
        columns: {
          keyword_column: body.google_sheets.columns?.keyword_column || 0,
          category_column: body.google_sheets.columns?.category_column || 1,
          metadata_columns: body.google_sheets.columns?.metadata_columns || [],
        },
        connection_status: "pending",
      },
      cache: {
        enabled: body.cache?.enabled !== undefined ? body.cache.enabled : true,
        ttl: body.cache?.ttl || 300,
      },
    });

    return NextResponse.json({ success: true, list }, { status: 201 });
  } catch (error) {
    console.error("Admin create keyword list error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A keyword list with this name already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create keyword list" },
      { status: 500 },
    );
  }
}
