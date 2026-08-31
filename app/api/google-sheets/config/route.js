// app/api/google-sheets/config/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import {
  getConfig,
  saveConfig,
} from "@/lib/services/google-sheets-manual.service";

// GET - Get the saved Google Sheets config
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getConfig();

    if (!config) {
      return NextResponse.json({ success: true, configured: false });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      config: {
        service_account_email: config.service_account_email,
        spreadsheet_id: config.spreadsheet_id,
        sheet_name: config.sheet_name,
        range: config.range,
        columns: config.columns,
        connection_status: config.connection_status,
        connection_error: config.connection_error,
        last_sync_at: config.last_sync_at,
        last_sync_count: config.last_sync_count,
        total_keywords: config.total_keywords,
        total_categories: config.total_categories,
        is_active: config.is_active,
      },
    });
  } catch (error) {
    console.error("Get Google Sheets config error:", error);
    return NextResponse.json(
      { error: "Failed to get config" },
      { status: 500 },
    );
  }
}

// POST - Save the Google Sheets config
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (
      !body.service_account_email ||
      !body.private_key ||
      !body.spreadsheet_id
    ) {
      return NextResponse.json(
        {
          error:
            "Service account email, private key, and spreadsheet ID are required",
        },
        { status: 400 },
      );
    }

    const config = await saveConfig(body);

    return NextResponse.json({
      success: true,
      config: {
        id: config._id,
        service_account_email: config.service_account_email,
        spreadsheet_id: config.spreadsheet_id,
        sheet_name: config.sheet_name,
        range: config.range,
        connection_status: config.connection_status,
      },
    });
  } catch (error) {
    console.error("Save Google Sheets config error:", error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 },
    );
  }
}
