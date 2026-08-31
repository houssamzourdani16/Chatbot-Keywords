// app/api/admin/keyword-lists/test/route.js
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { google } from "googleapis";
import dbConnect from "@/lib/database/database";
import KeywordList from "@/lib/models/keyword-list";
import { readKeywordsFromSheet } from "@/lib/services/keyword-list-service";

// POST - Test a Google Sheets connection step-by-step without saving
// Supports BOTH:
//  - Public sheets with a simple API Key (no OAuth)
//  - Service account credentials
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      sheet_id,
      sheet_name,
      api_key,
      service_account_email,
      private_key,
    } = body.google_sheets || {};

    // ============================================
    // STEP 1: Validate required fields
    // ============================================
    const steps = [];
    const missing = [];
    if (!sheet_id) missing.push("Sheet ID");

    if (missing.length > 0) {
      steps.push({
        step: 1,
        name: "Required Fields",
        status: "failed",
        message: `Missing: ${missing.join(", ")}`,
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 1,
      });
    }

    steps.push({
      step: 1,
      name: "Required Fields",
      status: "success",
      message: "✅ All required fields provided",
    });

    // ============================================
    // STEP 2: Determine auth method
    // ============================================
    const useApiKey = !!api_key;
    const useServiceAccount = !!service_account_email && !!private_key;
    const usePublic = !useApiKey && !useServiceAccount;

    try {
      if (useApiKey) {
        if (api_key.length < 10) {
          throw new Error("API Key looks too short");
        }
      } else if (useServiceAccount) {
        if (!service_account_email.includes("@")) {
          throw new Error("Invalid service account email format");
        }
        if (!private_key.includes("PRIVATE KEY")) {
          throw new Error("Invalid private key format");
        }
      }
      steps.push({
        step: 2,
        name: "Auth Method",
        status: "success",
        message: usePublic
          ? "✅ Using public sheet (no credentials needed)"
          : useApiKey
            ? "✅ Using API Key"
            : "✅ Using service account",
      });
    } catch (error) {
      steps.push({
        step: 2,
        name: "Auth Method",
        status: "failed",
        message: `❌ ${error.message}`,
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 2,
      });
    }

    // ============================================
    // STEP 3: Build auth / client
    // ============================================
    let sheets;
    let publicService = null;
    try {
      if (usePublic) {
        // Public sheet — use OpenSheet/CSV (no credentials)
        const { PublicSheetService } =
          await import("@/lib/services/public-sheet.service");
        publicService = new PublicSheetService(sheet_id, sheet_name, {
          keyword_column: body.google_sheets?.columns?.keyword_column || 0,
          category_column: body.google_sheets?.columns?.category_column || 1,
        });
        steps.push({
          step: 3,
          name: "Google Access",
          status: "success",
          message: "✅ Using free public sheet access (no API key)",
        });
      } else if (useApiKey) {
        sheets = google.sheets({
          version: "v4",
          auth: api_key,
        });
        steps.push({
          step: 3,
          name: "Google Authentication",
          status: "success",
          message: "✅ Using API Key for public sheet",
        });
      } else {
        const credentials = {
          client_email: service_account_email,
          private_key: private_key.replace(/\\n/g, "\n"),
        };
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        await auth.getClient();
        sheets = google.sheets({ version: "v4", auth });
        steps.push({
          step: 3,
          name: "Google Authentication",
          status: "success",
          message: "✅ Authenticated with Google",
        });
      }
    } catch (error) {
      steps.push({
        step: 3,
        name: "Google Authentication",
        status: "failed",
        message: `❌ Authentication failed: ${error.message}`,
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 3,
      });
    }

    // ============================================
    // STEP 4: Access the spreadsheet
    // ============================================
    let meta;
    let sheetNames = [];
    try {
      if (usePublic) {
        // Test public sheet access
        const testResult = await publicService.testConnection();
        if (!testResult.success) {
          throw new Error(testResult.error);
        }
        // Try to list all sheet names
        const listResult = await publicService.listSheetNames();
        sheetNames = listResult.sheetNames || [sheet_name || "Sheet1"];
        steps.push({
          step: 4,
          name: "Spreadsheet Access",
          status: "success",
          message: `✅ Public sheet accessible (${testResult.total} keywords)`,
        });
      } else {
        meta = await sheets.spreadsheets.get({
          spreadsheetId: sheet_id,
        });
        sheetNames = meta.data.sheets?.map((s) => s.properties?.title) || [];
        steps.push({
          step: 4,
          name: "Spreadsheet Access",
          status: "success",
          message: "✅ Spreadsheet found and accessible",
        });
      }
    } catch (error) {
      steps.push({
        step: 4,
        name: "Spreadsheet Access",
        status: "failed",
        message: `❌ Cannot access spreadsheet: ${error.message}`,
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 4,
      });
    }

    // ============================================
    // STEP 5: List all sheets in the spreadsheet
    // ============================================
    if (sheetNames.length === 0) {
      steps.push({
        step: 5,
        name: "List Sheets",
        status: "failed",
        message: "❌ No sheets found in this spreadsheet",
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 5,
      });
    }

    steps.push({
      step: 5,
      name: "List Sheets",
      status: "success",
      message: `✅ Found ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`,
      sheetNames,
    });

    // ============================================
    // STEP 6: Verify the selected sheet exists
    // ============================================
    if (sheet_name && !sheetNames.includes(sheet_name)) {
      steps.push({
        step: 6,
        name: "Selected Sheet",
        status: "failed",
        message: `❌ Sheet "${sheet_name}" not found. Available: ${sheetNames.join(", ")}`,
        sheetNames,
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 6,
        sheetNames,
      });
    }

    steps.push({
      step: 6,
      name: "Selected Sheet",
      status: "success",
      message: `✅ Sheet "${sheet_name || sheetNames[0]}" exists`,
      sheetNames,
    });

    // ============================================
    // STEP 7: Read a preview of the sheet data
    // ============================================
    const targetSheet = sheet_name || sheetNames[0];
    let preview = [];
    let previewError = null;
    let previewDataCount = 0;
    let previewColumnCount = 0;

    try {
      if (usePublic) {
        // Public sheet — get keywords with ALL columns as preview
        const result = await publicService.getKeywords();
        // Build preview: header row + ALL data rows (all columns)
        preview = [];
        if (result.headers && result.headers.length > 0) {
          preview.push(result.headers);
        }
        // Include ALL rows so the test verifies the complete data
        result.rows.forEach((row) => {
          preview.push(result.headers.map((h) => row[h] || ""));
        });
        // Attach the full row/column info for the message
        previewDataCount = result.rows.length;
        previewColumnCount = result.headers.length;
      } else {
        const previewRes = await sheets.spreadsheets.values.get({
          spreadsheetId: sheet_id,
          range: `${targetSheet}!A1:ZZ1000`,
        });
        preview = previewRes.data.values || [];
        previewDataCount = Math.max(0, preview.length - 1);
        previewColumnCount = (preview[0] || []).length;
      }
    } catch (error) {
      previewError = error.message;
    }

    if (previewError) {
      steps.push({
        step: 7,
        name: "Read Data",
        status: "failed",
        message: `❌ Could not read data: ${previewError}`,
      });
      return NextResponse.json({
        success: false,
        steps,
        currentStep: 7,
        sheetNames,
      });
    }

    steps.push({
      step: 7,
      name: "Read Data",
      status: "success",
      message: `✅ Read ${previewDataCount} row(s) × ${previewColumnCount} column(s) — all data verified`,
      preview,
    });

    // ============================================
    // STEP 8: Compare keywords with existing lists
    // ============================================
    let comparison = null;
    try {
      // Build a temp keyword list object to read all keywords
      const tempList = {
        google_sheets: {
          sheet_id,
          sheet_name: targetSheet,
          range: body.google_sheets?.range || "A:B",
          api_key: api_key || "",
          service_account_email: service_account_email || "",
          private_key: private_key || "",
          columns: body.google_sheets?.columns || {
            keyword_column: 0,
            category_column: 1,
          },
        },
      };

      const result = await readKeywordsFromSheet(tempList);
      const newKeywords = result.keywords.map((k) =>
        k.keyword.toLowerCase().trim(),
      );

      // Load all existing lists' keywords
      await dbConnect();
      const existingLists = await KeywordList.find({}).lean();
      const existingKeywords = new Set();
      const listKeywordCounts = [];

      for (const list of existingLists) {
        try {
          const listResult = await readKeywordsFromSheet(list);
          const listKeywords = listResult.keywords.map((k) =>
            k.keyword.toLowerCase().trim(),
          );
          listKeywords.forEach((k) => existingKeywords.add(k));
          listKeywordCounts.push({
            name: list.name,
            count: listKeywords.length,
          });
        } catch (e) {
          // Skip lists that fail
        }
      }

      // Compare
      const duplicates = newKeywords.filter((k) => existingKeywords.has(k));
      const unique = newKeywords.filter((k) => !existingKeywords.has(k));

      comparison = {
        total: newKeywords.length,
        duplicates: duplicates.length,
        unique: unique.length,
        duplicateKeywords: duplicates.slice(0, 20),
        uniqueKeywords: unique.slice(0, 20),
        existingLists: listKeywordCounts,
      };

      steps.push({
        step: 8,
        name: "Compare Keywords",
        status: "success",
        message: `✅ ${newKeywords.length} keywords: ${unique.length} new, ${duplicates.length} already exist`,
        comparison,
      });
    } catch (error) {
      steps.push({
        step: 8,
        name: "Compare Keywords",
        status: "failed",
        message: `❌ Could not compare keywords: ${error.message}`,
      });
    }

    return NextResponse.json({
      success: true,
      steps,
      currentStep: 8,
      sheetNames,
      preview,
      selectedSheet: targetSheet,
      comparison,
    });
  } catch (error) {
    console.error("Test keyword list connection error:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 },
    );
  }
}
