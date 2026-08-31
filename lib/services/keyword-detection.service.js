// lib/services/keyword-detection.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import { getKeywordsForList } from "@/lib/services/keyword-list-service";
import { processMessageKeywords } from "@/lib/services/google-sheets";

/**
 * ============================================
 * ✅ KEYWORD DETECTION SERVICE
 * ============================================
 *
 * Detects keywords in a message/conversation against a product's
 * selected keyword list (a Google Sheet).
 *
 * Each keyword carries its FULL row data from the spreadsheet
 * (keyword, category, meaning, priority, language, etc.), so the
 * payload sent to n8n contains everything needed.
 */

/**
 * Detect keywords in a piece of text against a specific keyword list.
 *
 * @param {string} text - The message/conversation text (lowercased & split internally)
 * @param {Array}  keywords - List of { keyword, category, data, ... } from the sheet
 * @returns {{ found: Array, detected_keywords: string[], keyword_data: Object }}
 *
 * found:             [{ keyword, category, meaning, priority, language, data, listName }]
 * detected_keywords: ["salam", "pizza", ...]  (ordered by first appearance)
 * keyword_data:      { "salam": { keyword, category, meaning, priority, row }, ... }
 */
export function detectKeywordsInText(text, keywords = []) {
  if (!text) {
    return { found: [], detected_keywords: [], keyword_data: {} };
  }

  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  // Build a lowercase lookup map once for performance
  const lookup = new Map(
    keywords.map((k, i) => [String(k.keyword).toLowerCase().trim(), k]),
  );

  const found = [];
  const keyword_data = {};
  const seen = new Set();

  for (const word of words) {
    if (seen.has(word)) continue;
    const match = lookup.get(word);
    if (match) {
      seen.add(word);
      const row =
        match.data && Array.isArray(match.data)
          ? match.data
          : [match.keyword, match.category];

      found.push({
        keyword: word,
        category: match.category || "Other",
        meaning: match.meaning || "",
        priority: match.priority || "Medium",
        language: match.language || "Darija",
        data: row,
        listName: match.listName || "",
      });

      keyword_data[word] = {
        keyword: word,
        category: match.category || "Other",
        meaning: match.meaning || "",
        priority: match.priority || "Medium",
        language: match.language || "Darija",
        row,
      };
    }
  }

  return {
    found,
    detected_keywords: Object.keys(keyword_data),
    keyword_data,
  };
}

/**
 * Detect keywords in a single message against the product's list.
 * Falls back to the global master sheet if the product has no list.
 *
 * @param {Object}  params
 * @param {string}  params.productId
 * @param {string}  params.message  - The message text
 * @returns {{ found, detected_keywords, keyword_data, listName }}
 */
export async function detectKeywordsForProduct({
  productId,
  message,
  productOverride = null,
}) {
  try {
    let product = productOverride;
    if (!product) {
      await dbConnect();
      product = await Product.findById(productId).lean();
    }

    const keywordListId = product?.keyword_list_id;
    const listName = product?.name || "";

    // ✅ Use the product's linked keyword list (Google Sheet)
    if (keywordListId) {
      const { keywords = [] } = await getKeywordsForList(
        keywordListId.toString(),
      );
      const result = detectKeywordsInText(message, keywords);

      // Attach the list name to each found keyword
      result.found = result.found.map((k) => ({ ...k, listName }));
      // Rebuild keyword_data with listName too
      Object.keys(result.keyword_data).forEach((w) => {
        result.keyword_data[w].listName = listName;
      });

      return result;
    }

    // ✅ Fallback: global master sheet
    const { found, unfound } = await processMessageKeywords(message);
    const detected_keywords = found.map((k) => k.keyword);
    const keyword_data = {};
    found.forEach((k) => {
      keyword_data[k.keyword] = {
        keyword: k.keyword,
        category: k.category,
        meaning: k.meaning || "",
        priority: k.priority || "Medium",
        language: k.language || "Darija",
        listName,
      };
    });

    return { found, detected_keywords, keyword_data, unfound, listName };
  } catch (error) {
    console.error("⚠️ detectKeywordsForProduct error:", error.message);
    // Non-fatal: keyword detection should never block message ingestion
    return { found: [], detected_keywords: [], keyword_data: {} };
  }
}
