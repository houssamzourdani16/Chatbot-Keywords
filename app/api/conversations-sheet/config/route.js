// app/api/conversations-sheet/config/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import {
  getConfigs,
  getConfigById,
  saveConfig,
  deleteConfig,
} from "@/lib/services/conversations-sheet.service";

// GET - Get all saved conversations sheet configs
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await getConfigs();

    return NextResponse.json({
      success: true,
      configured: configs.length > 0,
      configs: configs.map((c) => ({
        id: c._id,
        name: c.name,
        service_account_email: c.service_account_email,
        spreadsheet_id: c.spreadsheet_id,
        sheet_name: c.sheet_name,
        range: c.range,
        columns: c.columns,
        connection_status: c.connection_status,
        connection_error: c.connection_error,
        last_sync_at: c.last_sync_at,
        last_sync_count: c.last_sync_count,
        total_senders: c.total_senders,
        is_active: c.is_active,
      })),
    });
  } catch (error) {
    console.error("Get conversations sheet configs error:", error);
    return NextResponse.json(
      { error: "Failed to get configs" },
      { status: 500 },
    );
  }
}

// POST - Save (create or update) a conversations sheet config
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // ✅ Allow BOTH:
    //   - PUBLIC sheets (link-only): just spreadsheet_id, no credentials.
    //   - Service account sheets: service_account_email + private_key.
    if (!body.spreadsheet_id) {
      return NextResponse.json(
        {
          error: "Spreadsheet ID is required",
        },
        { status: 400 },
      );
    }

    const config = await saveConfig(body, body.id);

    return NextResponse.json({
      success: true,
      config: {
        id: config._id,
        name: config.name,
        service_account_email: config.service_account_email,
        spreadsheet_id: config.spreadsheet_id,
        sheet_name: config.sheet_name,
        range: config.range,
        connection_status: config.connection_status,
      },
    });
  } catch (error) {
    console.error("Save conversations sheet config error:", error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a conversations sheet config by id
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Config id is required" },
        { status: 400 },
      );
    }

    await deleteConfig(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete conversations sheet config error:", error);
    return NextResponse.json(
      { error: "Failed to delete config" },
      { status: 500 },
    );
  }
}
