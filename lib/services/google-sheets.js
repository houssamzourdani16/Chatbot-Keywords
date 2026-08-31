// lib/services/google-sheets.js
import "server-only";
import { google } from "googleapis";
import dbConnect from "@/lib/database/database";
import Setting from "@/lib/models/setting";

/**
 * ============================================
 * ✅ GOOGLE SHEETS SERVICE
 * ============================================
 *
 * Connects to Google Sheets to:
 *  1. READ keywords from the master sheet (with meanings)
 *  2. WRITE unfound keywords to a second "new keywords" sheet
 *
 * Credentials are stored in the Setting collection (managed by the
 * super admin in the Settings page) OR via environment variables.
 *
 * Required settings (stored in DB):
 *  - sheets.service_account_json  → the full service account JSON (string)
 *  - sheets.master_sheet_id       → spreadsheet ID of the master keywords sheet
 *  - sheets.new_sheet_id          → spreadsheet ID of the new/unfound keywords sheet
 *  - sheets.master_range          → e.g. "Keywords!A2:F"
 *  - sheets.new_range             → e.g. "NewKeywords!A2:F"
 *
 * Alternatively, use env vars:
 *  - GOOGLE_SERVICE_ACCOUNT_JSON
 *  - GOOGLE_MASTER_SHEET_ID
 *  - GOOGLE_NEW_SHEET_ID
 */

// Cache the auth client so we don't re-authenticate every call
let cachedAuth = null;

/**
 * Get a Google Sheets auth client from the stored service account.
 */
async function getAuth() {
  if (cachedAuth) return cachedAuth;

  // Load settings from DB (fall back to env vars)
  await dbConnect();
  const settings = await Setting.find({}).lean();
  const settingMap = {};
  settings.forEach((s) => (settingMap[s.key] = s.value));

  const serviceAccountJson =
    settingMap["sheets.service_account_json"] ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error(
      "Google Sheets not configured. Add your service account JSON in Settings → Google Sheets.",
    );
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error("Invalid service account JSON format.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedAuth = auth;
  return auth;
}

/**
 * Get the configured spreadsheet IDs.
 */
async function getSheetConfig() {
  await dbConnect();
  const settings = await Setting.find({}).lean();
  const settingMap = {};
  settings.forEach((s) => (settingMap[s.key] = s.value));

  return {
    masterSheetId:
      settingMap["sheets.master_sheet_id"] ||
      process.env.GOOGLE_MASTER_SHEET_ID,
    newSheetId:
      settingMap["sheets.new_sheet_id"] || process.env.GOOGLE_NEW_SHEET_ID,
    masterRange: settingMap["sheets.master_range"] || "Keywords!A2:F",
    newRange: settingMap["sheets.new_range"] || "NewKeywords!A2:F",
  };
}

/**
 * Read all keywords from the master sheet.
 * Returns an array of keyword objects:
 *   [{ keyword, category, language, meaning, synonyms, priority }]
 */
export async function readMasterKeywords() {
  try {
    const auth = await getAuth();
    const config = await getSheetConfig();

    if (!config.masterSheetId) {
      throw new Error("Master sheet ID not configured.");
    }

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.masterSheetId,
      range: config.masterRange,
    });

    const rows = response.data.values || [];

    // Expected columns: Keyword | Category | Language | Meaning | Synonyms | Priority
    const keywords = rows
      .filter((row) => row[0] && row[0].trim())
      .map((row) => ({
        keyword: row[0].trim().toLowerCase(),
        category: row[1]?.trim() || "Other",
        language: row[2]?.trim() || "Darija",
        meaning: row[3]?.trim() || "",
        synonyms: row[4]
          ? row[4]
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          : [],
        priority: row[5]?.trim() || "Medium",
      }));

    return keywords;
  } catch (error) {
    console.error("❌ Google Sheets read error:", error.message);
    return [];
  }
}

/**
 * Find the meaning of a keyword by looking it up in the master sheet.
 * Returns the keyword object if found, or null.
 */
export async function findKeywordMeaning(keyword) {
  const keywords = await readMasterKeywords();
  const normalized = keyword.toLowerCase().trim();

  // Exact match
  const exact = keywords.find((k) => k.keyword === normalized);
  if (exact) return exact;

  // Check synonyms
  const bySynonym = keywords.find((k) => k.synonyms.includes(normalized));
  if (bySynonym) return bySynonym;

  // Partial match (keyword contains the term)
  const partial = keywords.find(
    (k) => k.keyword.includes(normalized) || normalized.includes(k.keyword),
  );
  if (partial) return partial;

  return null;
}

/**
 * Append a list of unfound keywords to the "new keywords" sheet.
 * Each row: Keyword | Category | Language | Meaning | Priority | Status
 */
export async function appendUnfoundKeywords(unfoundKeywords) {
  try {
    const auth = await getAuth();
    const config = await getSheetConfig();

    if (!config.newSheetId) {
      throw new Error("New keywords sheet ID not configured.");
    }

    const sheets = google.sheets({ version: "v4", auth });

    // Build rows: [keyword, category, language, meaning, priority, status]
    const rows = unfoundKeywords.map((k) => [
      k.keyword,
      k.category || "Other",
      k.language || "Darija",
      k.meaning || "",
      k.priority || "Medium",
      "pending",
    ]);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.newSheetId,
      range: config.newRange,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });

    return {
      success: true,
      appended: rows.length,
      updatedRange: response.data.updates?.updatedRange,
    };
  } catch (error) {
    console.error("❌ Google Sheets append error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Extract keywords from a message text by splitting on non-word characters.
 * Returns an array of unique lowercase words.
 */
export function extractKeywordsFromMessage(message) {
  if (!message) return [];
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1); // ignore single letters

  return [...new Set(words)];
}

/**
 * Process a message: extract keywords, look up meanings in the master
 * sheet, and collect any unfound keywords to be appended to the new sheet.
 *
 * Returns:
 *   {
 *     found: [{ keyword, meaning, category, language, priority }],
 *     unfound: [keyword1, keyword2, ...]
 *   }
 */
export async function processMessageKeywords(message) {
  const words = extractKeywordsFromMessage(message);
  const found = [];
  const unfound = [];

  for (const word of words) {
    const match = await findKeywordMeaning(word);
    if (match) {
      found.push({
        keyword: word,
        meaning: match.meaning,
        category: match.category,
        language: match.language,
        priority: match.priority,
      });
    } else {
      unfound.push(word);
    }
  }

  // If there are unfound keywords, append them to the new sheet
  if (unfound.length > 0) {
    await appendUnfoundKeywords(unfound.map((k) => ({ keyword: k })));
  }

  return { found, unfound };
}
