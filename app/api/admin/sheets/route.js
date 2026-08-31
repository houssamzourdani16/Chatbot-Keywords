// app/api/admin/sheets/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Setting from "@/lib/models/setting";
import { verifyAdmin } from "@/lib/auth/admin";
import { google } from "googleapis";

// GET - Read the new/unfound keywords sheet
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const settings = await Setting.find({}).lean();
    const settingMap = {};
    settings.forEach((s) => (settingMap[s.key] = s.value));

    const serviceAccountJson =
      settingMap["sheets.service_account_json"] ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const newSheetId =
      settingMap["sheets.new_sheet_id"] || process.env.GOOGLE_NEW_SHEET_ID;
    const newRange = settingMap["sheets.new_range"] || "NewKeywords!A2:F";

    if (!serviceAccountJson || !newSheetId) {
      return NextResponse.json({
        success: true,
        keywords: [],
        configured: false,
        message: "Google Sheets not configured yet.",
      });
    }

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: newSheetId,
      range: newRange,
    });

    const rows = response.data.values || [];
    const keywords = rows
      .filter((row) => row[0] && row[0].trim())
      .map((row, index) => ({
        row: index + 2, // +2 because A1 is header, and index starts at 0
        keyword: row[0].trim(),
        category: row[1]?.trim() || "",
        language: row[2]?.trim() || "",
        meaning: row[3]?.trim() || "",
        priority: row[4]?.trim() || "",
        status: row[5]?.trim() || "pending",
      }));

    return NextResponse.json({
      success: true,
      keywords,
      configured: true,
    });
  } catch (error) {
    console.error("❌ Read new sheet error:", error.message);
    return NextResponse.json(
      { error: "Failed to read new keywords sheet: " + error.message },
      { status: 500 },
    );
  }
}

// PATCH - Update a keyword's meaning in the new sheet
export async function PATCH(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { row, meaning, category, language, priority, status } = body;

    if (!row) {
      return NextResponse.json({ error: "row is required" }, { status: 400 });
    }

    await dbConnect();
    const settings = await Setting.find({}).lean();
    const settingMap = {};
    settings.forEach((s) => (settingMap[s.key] = s.value));

    const serviceAccountJson =
      settingMap["sheets.service_account_json"] ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const newSheetId =
      settingMap["sheets.new_sheet_id"] || process.env.GOOGLE_NEW_SHEET_ID;

    if (!serviceAccountJson || !newSheetId) {
      return NextResponse.json(
        { error: "Google Sheets not configured" },
        { status: 400 },
      );
    }

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Update the row: [keyword, category, language, meaning, priority, status]
    const range = `NewKeywords!A${row}:F${row}`;
    const values = [
      [
        body.keyword || "",
        category || "",
        language || "",
        meaning || "",
        priority || "Medium",
        status || "pending",
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return NextResponse.json({
      success: true,
      message: "Keyword updated in sheet",
    });
  } catch (error) {
    console.error("❌ Update new sheet error:", error.message);
    return NextResponse.json(
      { error: "Failed to update keyword: " + error.message },
      { status: 500 },
    );
  }
}
