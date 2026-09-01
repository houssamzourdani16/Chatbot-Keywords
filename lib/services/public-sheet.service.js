// lib/services/public-sheet.service.js
import "server-only";

/**
 * ============================================
 * ✅ PUBLIC SHEET SERVICE (No API Key!)
 * ============================================
 *
 * Fetches keywords from a PUBLIC Google Sheet
 * (shared with "Anyone with the link can view")
 * WITHOUT needing a Google API Key.
 *
 * Uses two free methods:
 *  1. OpenSheet API (https://opensheet.elk.sh) — JSON API
 *  2. Google Sheets CSV export — fallback
 *
 * Usage:
 *   const service = new PublicSheetService('1abc123def456', 'Sheet1');
 *   const result = await service.getKeywords();
 *   // Returns: { keywords: ['salam', 'labas'], categories: { salam: 'greeting' } }
 */

export class PublicSheetService {
  constructor(sheetId, sheetName = "Sheet1", columns = {}) {
    this.sheetId = sheetId;
    this.sheetName = sheetName;
    this.columns = {
      keyword_column: columns.keyword_column || 0,
      category_column: columns.category_column || 1,
    };
  }

  /**
   * Fetch raw rows from the public sheet.
   * Tries OpenSheet first, then falls back to CSV export.
   */
  async fetchRows() {
    // Method 1: OpenSheet API (returns objects, no header row)
    try {
      const url = `https://opensheet.elk.sh/${this.sheetId}/${encodeURIComponent(this.sheetName)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            type: "json",
            headers: Object.keys(data[0]),
            rows: data, // objects
          };
        }
      }
    } catch (e) {
      // Fall through to CSV
    }

    // Method 2: Google Sheets CSV export (includes header row)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(this.sheetName)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const csv = await res.text();
        const rows = this.parseCSV(csv);
        if (rows.length > 0) {
          return {
            type: "csv",
            headers: rows[0], // header row
            rows: rows.slice(1), // data rows
          };
        }
      }
    } catch (e) {
      // Fall through
    }

    throw new Error(
      "Could not access the public sheet. Make sure it's shared with 'Anyone with the link can view'.",
    );
  }

  /**
   * Parse CSV text into an array of row arrays.
   */
  parseCSV(csv) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      if (inQuotes) {
        if (char === '"') {
          if (csv[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && csv[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
      } else {
        field += char;
      }
    }
    // Last row
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);

    return rows;
  }

  /**
   * Normalize rows into a consistent array of arrays.
   * OpenSheet returns objects; CSV returns arrays.
   */
  normalizeRows(rows) {
    if (rows.length === 0) return [];

    // If rows are objects (OpenSheet), convert to arrays
    if (typeof rows[0] === "object" && !Array.isArray(rows[0])) {
      const headers = Object.keys(rows[0]);
      return rows.map((obj) => headers.map((h) => obj[h] || ""));
    }
    return rows;
  }

  /**
   * Get keywords and ALL columns from the sheet.
   * Returns { keywords, categories, rows, headers, total }
   */
  async getKeywords() {
    const result = await this.fetchRows();
    const headers = result.headers || [];
    const rawRows = result.rows || [];

    const keywordCol = this.columns.keyword_column;
    const categoryCol = this.columns.category_column;

    // Normalize rows: JSON (objects) → arrays, CSV already arrays
    const rows = rawRows.map((row) => {
      if (typeof row === "object" && !Array.isArray(row)) {
        return headers.map((h) => row[h] || "");
      }
      return row;
    });

    const keywords = [];
    const categories = {};
    const allRows = [];

    // Skip header row if it starts at row 0 (CSV fallback case)
    const startRow =
      rows.length > 0 && this.isHeader(rows[0], keywordCol) ? 1 : 0;

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      const keyword = (row[keywordCol] || "").trim();
      if (!keyword) continue;

      const category = (row[categoryCol] || "Other").trim();
      keywords.push(keyword);
      categories[keyword] = category;

      // ✅ Keep the FULL row (all columns) with headers as keys
      const rowObj = {};
      row.forEach((cell, idx) => {
        const name = headers[idx] || `col_${idx}`;
        rowObj[name] = cell || "";
      });
      allRows.push(rowObj);
    }

    return {
      keywords,
      categories,
      rows: allRows,
      headers,
      total: keywords.length,
    };
  }

  /**
   * Check if a row looks like a header.
   */
  isHeader(row, keywordCol) {
    const val = (row[keywordCol] || "").toLowerCase();
    const headerNames = [
      "keyword",
      "keywords",
      "word",
      "mot",
      "كلمة",
      "darija",
      "latin",
      "arabic",
      "french",
      "english",
      "meaning",
      "category",
      "categorie",
      "synonym",
      "synonyms",
      "priority",
      "detection_words",
      "detection word",
    ];
    return headerNames.includes(val);
  }

  /**
   * Test if the sheet is accessible.
   * Returns { success, message, sheetNames?, error? }
   */
  async testConnection() {
    try {
      const result = await this.getKeywords();
      return {
        success: true,
        message: `✅ Connected! Found ${result.total} keywords`,
        total: result.total,
        preview: result.keywords.slice(0, 5),
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * List all sheet names in the public spreadsheet.
   * Tries common sheet names concurrently for speed.
   * Returns { success, sheetNames, error? }
   */
  async listSheetNames() {
    // Try the current sheet name first, plus common ones, ALL concurrently
    const commonNames = [
      this.sheetName,
      "Sheet1",
      "Keywords",
      "Sheet 1",
      "Keyword",
      "Darija",
      "Data",
      "Sheet2",
    ];
    const uniqueNames = [...new Set(commonNames.filter(Boolean))];

    const checks = await Promise.all(
      uniqueNames.map(async (name) => {
        try {
          const url = `https://opensheet.elk.sh/${this.sheetId}/${encodeURIComponent(name)}`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return name;
            }
          }
          return null;
        } catch (e) {
          return null;
        }
      }),
    );

    const found = checks.filter(Boolean);

    // Fallback: include the current sheet name
    if (found.length === 0) {
      found.push(this.sheetName || "Sheet1");
    }

    return { success: true, sheetNames: found };
  }
}

/**
 * Convenience function to fetch keywords from a public sheet.
 */
export async function fetchPublicKeywords(sheetId, sheetName, columns) {
  const service = new PublicSheetService(sheetId, sheetName, columns);
  return service.getKeywords();
}
