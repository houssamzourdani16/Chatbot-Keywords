// lib/services/google-sheets-manual.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import GoogleSheetsConfig from "@/lib/models/google-sheets-config";
import {
  buildServiceAccountAuth,
  validateCredentials,
  getSheetsClient,
} from "@/lib/utils/google-auth";
import { google } from "googleapis";

/**
 * ============================================
 * ✅ MANUAL GOOGLE SHEETS SERVICE
 * ============================================
 *
 * Manual (service account) connection to Google Sheets.
 * No OAuth required — users enter credentials directly.
 *
 * Functions:
 *  - getConfig()          → get the saved config
 *  - saveConfig()         → save/update the config
 *  - testConnection()     → test the connection step-by-step
 *  - syncKeywords()       → read keywords from the sheet
 *  - getKeywords()        → get keywords (with cache)
 */

// In-memory cache: { keywords, fetchedAt }
let memoryCache = null;

/**
 * Get the saved Google Sheets config.
 */
export async function getConfig() {
  await dbConnect();
  return GoogleSheetsConfig.findOne({}).lean();
}

/**
 * Save (create or update) the Google Sheets config.
 */
export async function saveConfig(data) {
  await dbConnect();

  const config = await GoogleSheetsConfig.findOne({});

  const payload = {
    service_account_email: data.service_account_email,
    private_key: data.private_key,
    spreadsheet_id: data.spreadsheet_id,
    sheet_name: data.sheet_name || "Sheet1",
    range: data.range || "A:Z",
    columns: {
      keyword_column: data.columns?.keyword_column || 0,
      category_column: data.columns?.category_column || 1,
      metadata_columns: data.columns?.metadata_columns || [],
    },
    is_active: data.is_active !== undefined ? data.is_active : true,
  };

  if (config) {
    Object.assign(config, payload);
    await config.save();
    return config;
  }

  return GoogleSheetsConfig.create(payload);
}

/**
 * Test the connection to the Google Sheet step-by-step.
 * Returns { success, steps, sheetNames?, preview?, error? }
 */
export async function testConnection(data) {
  const steps = [];

  // STEP 1: Validate required fields
  const missing = [];
  if (!data.service_account_email) missing.push("Service Account Email");
  if (!data.private_key) missing.push("Private Key");
  if (!data.spreadsheet_id) missing.push("Spreadsheet ID");

  if (missing.length > 0) {
    steps.push({
      step: 1,
      name: "Required Fields",
      status: "failed",
      message: `Missing: ${missing.join(", ")}`,
    });
    return { success: false, steps, currentStep: 1 };
  }
  steps.push({
    step: 1,
    name: "Required Fields",
    status: "success",
    message: "✅ All required fields provided",
  });

  // STEP 2: Validate credentials format
  const credCheck = validateCredentials(
    data.service_account_email,
    data.private_key,
  );
  if (!credCheck.valid) {
    steps.push({
      step: 2,
      name: "Credentials Format",
      status: "failed",
      message: `❌ ${credCheck.error}`,
    });
    return { success: false, steps, currentStep: 2 };
  }
  steps.push({
    step: 2,
    name: "Credentials Format",
    status: "success",
    message: "✅ Credentials look valid",
  });

  // STEP 3: Authenticate with Google
  let sheets;
  try {
    const auth = buildServiceAccountAuth(
      data.service_account_email,
      data.private_key,
    );
    await auth.getClient();
    sheets = google.sheets({ version: "v4", auth });
    steps.push({
      step: 3,
      name: "Google Authentication",
      status: "success",
      message: "✅ Authenticated with Google",
    });
  } catch (error) {
    steps.push({
      step: 3,
      name: "Google Authentication",
      status: "failed",
      message: `❌ Authentication failed: ${error.message}`,
    });
    return { success: false, steps, currentStep: 3 };
  }

  // STEP 4: Access the spreadsheet
  let meta;
  try {
    meta = await sheets.spreadsheets.get({
      spreadsheetId: data.spreadsheet_id,
    });
    steps.push({
      step: 4,
      name: "Spreadsheet Access",
      status: "success",
      message: "✅ Spreadsheet found and accessible",
    });
  } catch (error) {
    steps.push({
      step: 4,
      name: "Spreadsheet Access",
      status: "failed",
      message: `❌ Cannot access spreadsheet: ${error.message}`,
    });
    return { success: false, steps, currentStep: 4 };
  }

  // STEP 5: List all sheets
  const sheetNames = meta.data.sheets?.map((s) => s.properties?.title) || [];
  if (sheetNames.length === 0) {
    steps.push({
      step: 5,
      name: "List Sheets",
      status: "failed",
      message: "❌ No sheets found in this spreadsheet",
    });
    return { success: false, steps, currentStep: 5 };
  }
  steps.push({
    step: 5,
    name: "List Sheets",
    status: "success",
    message: `✅ Found ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`,
    sheetNames,
  });

  // STEP 6: Verify the selected sheet exists
  const sheetName = data.sheet_name || sheetNames[0];
  if (!sheetNames.includes(sheetName)) {
    steps.push({
      step: 6,
      name: "Selected Sheet",
      status: "failed",
      message: `❌ Sheet "${sheetName}" not found. Available: ${sheetNames.join(", ")}`,
      sheetNames,
    });
    return { success: false, steps, currentStep: 6, sheetNames };
  }
  steps.push({
    step: 6,
    name: "Selected Sheet",
    status: "success",
    message: `✅ Sheet "${sheetName}" exists`,
    sheetNames,
  });

  // STEP 7: Read a preview of the data
  let preview = [];
  let previewError = null;
  try {
    const previewRes = await sheets.spreadsheets.values.get({
      spreadsheetId: data.spreadsheet_id,
      range: `${sheetName}!A1:F5`,
    });
    preview = previewRes.data.values || [];
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
    return { success: false, steps, currentStep: 7, sheetNames };
  }

  steps.push({
    step: 7,
    name: "Read Data",
    status: "success",
    message: `✅ Read ${preview.length} row(s) of preview data`,
    preview,
  });

  return {
    success: true,
    steps,
    currentStep: 7,
    sheetNames,
    preview,
    selectedSheet: sheetName,
  };
}

/**
 * Read keywords from the configured sheet.
 * Returns { keywords, total, categories }
 */
export async function readKeywords() {
  const config = await getConfig();
  if (!config) {
    throw new Error("Google Sheets not configured");
  }

  const sheets = getSheetsClient(
    config.service_account_email,
    config.private_key,
  );

  const { spreadsheet_id, sheet_name, range, columns } = config;
  const fullRange = `${sheet_name}!${range}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet_id,
    range: fullRange,
  });

  const rows = response.data.values || [];
  const keywordCol = columns.keyword_column || 0;
  const categoryCol = columns.category_column || 1;

  const keywords = [];
  const categories = new Set();

  // Skip header row if it looks like a header
  const startRow = rows.length > 0 && isHeader(rows[0], keywordCol) ? 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const keyword = row[keywordCol]?.trim();
    if (!keyword) continue;

    const category = row[categoryCol]?.trim() || "Other";
    categories.add(category);
    keywords.push({ keyword, category });
  }

  return {
    keywords,
    total: keywords.length,
    categories: categories.size,
  };
}

/**
 * Check if a row looks like a header.
 */
function isHeader(row, keywordCol) {
  const val = row[keywordCol]?.toLowerCase() || "";
  return (
    val === "keyword" ||
    val === "keywords" ||
    val === "word" ||
    val === "mot" ||
    val === "كلمة"
  );
}

/**
 * Sync keywords from the sheet and update stats.
 */
export async function syncKeywords() {
  const config = await getConfig();
  if (!config) {
    throw new Error("Google Sheets not configured");
  }

  try {
    const result = await readKeywords();

    config.connection_status = "connected";
    config.connection_error = null;
    config.last_sync_at = new Date();
    config.last_sync_count = result.total;
    config.total_keywords = result.total;
    config.total_categories = result.categories;
    await config.save();

    memoryCache = {
      keywords: result.keywords,
      fetchedAt: Date.now(),
    };

    return {
      success: true,
      total: result.total,
      categories: result.categories,
      keywords: result.keywords,
    };
  } catch (error) {
    config.connection_status = "failed";
    config.connection_error = error.message;
    await config.save();
    return { success: false, error: error.message };
  }
}

/**
 * Get keywords (with cache).
 */
export async function getKeywords({ forceRefresh = false } = {}) {
  const config = await getConfig();
  if (!config) {
    throw new Error("Google Sheets not configured");
  }

  const ttl = 300 * 1000; // 5 min cache

  if (
    !forceRefresh &&
    memoryCache &&
    Date.now() - memoryCache.fetchedAt < ttl
  ) {
    return {
      keywords: memoryCache.keywords,
      total: memoryCache.keywords.length,
      fromCache: true,
    };
  }

  const result = await syncKeywords();
  if (!result.success) {
    if (memoryCache) {
      return {
        keywords: memoryCache.keywords,
        total: memoryCache.keywords.length,
        fromCache: true,
        stale: true,
      };
    }
    throw new Error(result.error);
  }

  return {
    keywords: result.keywords,
    total: result.total,
    fromCache: false,
  };
}
