// app/api/admin/settings/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Setting from "@/lib/models/setting";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - Get all settings
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const settings = await Setting.find({}).lean();

    const grouped = {};
    settings.forEach((s) => {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = s.value;
    });

    return NextResponse.json({ success: true, settings: grouped });
  } catch (error) {
    console.error("Admin settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// POST - Save settings (bulk upsert)
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    // body: { group: "general", settings: { site_name: "MyApp", ... } }
    const { group = "general", settings = {} } = body;

    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value, group } },
        upsert: true,
      },
    }));

    if (ops.length) {
      await Setting.bulkWrite(ops);
    }

    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error) {
    console.error("Admin save settings error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
