// lib/services/keyword-list-service.js
import "server-only";
import { google } from "googleapis";
import dbConnect from "@/lib/database/database";
import KeywordList from "@/lib/models/keyword-list";

/**
 * ============================================
 * ✅ KEYWORD LIST SERVICE (Google Sheets)
 * ============================================
 *
 * Keywords are stored in Google Sheets, NOT in the database.
 * Each KeywordList document stores the Google Sheets config
 * (sheet_id, service account, column mapping) and a cache.
 *
 * This service:
 *  1. Reads keywords from a Google Sheet
 *  2. Tests the connection
 *  3. Syncs keywords into the cache
 *  4. Fetches keywords (with cache)
 */

// In-memory cache: { [listId]: { keywords, fetchedAt } }
const memoryCache = new Map();

/**
 * Build a Google Sheets auth client from a KeywordList's credentials.
 * Supports BOTH:
 *  - Public sheets with a simple API Key (no OAuth)
 *  - Service account credentials
 */
function buildAuth(keywordList) {
  const { api_key, service_account_email, private_key } =
    keywordList.google_sheets;

  // ✅ PUBLIC SHEET: Use simple API Key
  if (api_key) {
    return api_key;
  }

  // Service account fallback
  const credentials = {
    client_email: service_account_email,
    private_key: private_key.replace(/\\n/g, "\n"),
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/**
 * Get a Google Sheets client, handling both API key and service account auth.
 */
function getSheetsClient(keywordList) {
  const auth = buildAuth(keywordList);
  return google.sheets({ version: "v4", auth });
}

/**
 * Test the connection to a Google Sheet.
 * Returns { success, message, sheetNames?, error? }
 */
export async function testKeywordListConnection(keywordList) {
  try {
    const sheets = getSheetsClient(keywordList);

    const { sheet_id, sheet_name } = keywordList.google_sheets;

    // Try to read the sheet metadata to verify access
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheet_id,
    });

    const sheetNames = meta.data.sheets?.map((s) => s.properties?.title) || [];

    // Verify the specified sheet exists
    if (sheet_name && !sheetNames.includes(sheet_name)) {
      return {
        success: false,
        message: `Sheet "${sheet_name}" not found. Available: ${sheetNames.join(", ")}`,
        sheetNames,
      };
    }

    return {
      success: true,
      message: "✅ Connection successful!",
      sheetNames,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Connection failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Read keywords from the Google Sheet.
 * Returns { keywords: [{keyword, category}], total, categories }
 *
 * Supports THREE methods:
 *  1. Public sheet via OpenSheet/CSV (no API key needed)
 *  2. Public sheet via Google API Key
 *  3. Service account credentials
 */
export async function readKeywordsFromSheet(keywordList) {
  const { sheet_id, sheet_name, range, columns, api_key } =
    keywordList.google_sheets;

  // ✅ METHOD 1: Public sheet (no API key, no service account)
  // Use OpenSheet / CSV export — free and simple
  if (!api_key && !keywordList.google_sheets.service_account_email) {
    const { PublicSheetService } =
      await import("@/lib/services/public-sheet.service");
    const service = new PublicSheetService(sheet_id, sheet_name, columns);
    const result = await service.getKeywords();

    // ✅ Keep the FULL row (all columns) for each keyword
    const keywords = result.rows.map((row, i) => ({
      keyword: result.keywords[i] || row[columns?.keyword_column || 0] || "",
      category: result.categories[result.keywords[i]] || "Other",
      // All columns preserved
      data: row,
    }));

    return {
      keywords,
      headers: result.headers,
      total: keywords.length,
      categories: new Set(keywords.map((k) => k.category)).size,
    };
  }

  // ✅ METHOD 2 & 3: API key or service account
  try {
    const sheets = getSheetsClient(keywordList);

    const fullRange = `${sheet_name}!${range}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet_id,
      range: fullRange,
    });

    const rows = response.data.values || [];
    const keywordCol = columns.keyword_column || 0;
    const categoryCol = columns.category_column || 1;

    const keywords = [];
    const categories = new Set();

    // Skip header row (row 0) if it looks like a header
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
  } catch (error) {
    console.error("❌ Read keywords from sheet error:", error.message);
    throw error;
  }
}

/**
 * Check if a row looks like a header (contains "keyword" or "category").
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
 * Sync keywords from the Google Sheet into the cache and update stats.
 */
export async function syncKeywordList(listId) {
  await dbConnect();

  const keywordList = await KeywordList.findById(listId);
  if (!keywordList) {
    throw new Error("Keyword list not found");
  }

  // Mark as syncing
  keywordList.sync_status = "syncing";
  keywordList.sync_error = null;
  await keywordList.save();

  try {
    const result = await readKeywordsFromSheet(keywordList);

    // Update stats
    keywordList.stats.total_keywords = result.total;
    keywordList.stats.total_categories = result.categories;
    keywordList.stats.last_sync_count = result.total;
    keywordList.cache.last_sync_at = new Date();
    keywordList.cache.last_sync_count = result.total;
    keywordList.sync_status = "success";
    keywordList.google_sheets.connection_status = "connected";
    keywordList.google_sheets.connection_error = null;

    await keywordList.save();

    // Store in memory cache
    memoryCache.set(listId, {
      keywords: result.keywords,
      fetchedAt: Date.now(),
    });

    return {
      success: true,
      total: result.total,
      categories: result.categories,
      keywords: result.keywords,
    };
  } catch (error) {
    keywordList.sync_status = "failed";
    keywordList.sync_error = error.message;
    keywordList.google_sheets.connection_status = "failed";
    keywordList.google_sheets.connection_error = error.message;
    await keywordList.save();

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get keywords for a list, using cache if fresh.
 */
export async function getKeywordsForList(
  listId,
  { forceRefresh = false } = {},
) {
  await dbConnect();

  const keywordList = await KeywordList.findById(listId).lean();
  if (!keywordList) {
    throw new Error("Keyword list not found");
  }

  // Check memory cache
  const cached = memoryCache.get(listId);
  const ttl = (keywordList.cache?.ttl || 300) * 1000;

  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < ttl) {
    return {
      keywords: cached.keywords,
      total: cached.keywords.length,
      fromCache: true,
    };
  }

  // Sync fresh
  const result = await syncKeywordList(listId);
  if (!result.success) {
    // Fall back to stale cache if available
    if (cached) {
      return {
        keywords: cached.keywords,
        total: cached.keywords.length,
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

/**
 * Get all active keyword lists (for webhook processing).
 */
export async function getActiveKeywordLists() {
  await dbConnect();
  return KeywordList.find({ is_active: true }).lean();
}

/**
 * Search for a keyword across all active lists.
 * Returns the keyword info if found, or null.
 */
export async function findKeywordAcrossLists(keyword) {
  const lists = await getActiveKeywordLists();
  const normalized = keyword.toLowerCase().trim();

  for (const list of lists) {
    try {
      const { keywords } = await getKeywordsForList(list._id.toString());
      const match = keywords.find(
        (k) => k.keyword.toLowerCase() === normalized,
      );
      if (match) {
        return {
          keyword: match.keyword,
          category: match.category,
          listName: list.name,
          listId: list._id,
        };
      }
    } catch (e) {
      // Skip lists that fail to load
      continue;
    }
  }

  return null;
}
