// lib/services/keyword-detection.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import {
  getKeywordsForList,
  getActiveKeywordLists,
} from "@/lib/services/keyword-list-service";
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

  // ✅ Normalize the message: lowercase, strip punctuation, collapse spaces.
  //    This separates the message into clean tokens (keyword by keyword).
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into individual words (single-word keywords)
  const words = normalizedText.split(/\s+/).filter((w) => w.length > 1);

  // ✅ Build SEPARATE lookup maps so we can search in priority order:
  //    1. Column A (darija / main keyword) — highest priority
  //    2. Column B (latin / transliteration) — fallback
  //    3. Other variant columns (wrongVariants, detection_words, synonyms)
  //    If a word is found in Column A, we use that row. Only if it's NOT
  //    found in Column A do we check Column B, then the other variants.
  const lookupA = new Map(); // Column A (darija / main keyword)
  const lookupB = new Map(); // Column B (latin)
  const lookupOther = new Map(); // wrongVariants, detection_words, synonyms

  for (const k of keywords) {
    // Column A: the main keyword
    const main = String(k.keyword).toLowerCase().trim();
    if (main) lookupA.set(main, k);

    // Column B: latin transliteration
    const latin = getColumnValue(k, "latin");
    if (latin) {
      splitVariants(latin).forEach((v) => lookupB.set(v, k));
    }

    // Other variant columns
    const other = getColumnValue(k, [
      "wrongvariants",
      "wrong_variants",
      "detection_words",
      "detectionwords",
      "synonyms",
      "synonym",
    ]);
    if (other) {
      splitVariants(other).forEach((v) => lookupOther.set(v, k));
    }
  }

  const found = [];
  const keyword_data = {};
  const seen = new Set();

  // ✅ 1. Match multi-word keywords (phrases) first, e.g. "bon prix",
  //    "pas cher", "livraison gratuite". These are checked as whole
  //    phrases against the message before falling back to single words.
  for (const k of keywords) {
    const phrase = String(k.keyword).toLowerCase().trim();
    if (!phrase || phrase.split(/\s+/).length < 2) continue; // single words handled below
    if (seen.has(phrase)) continue;
    if (normalizedText.includes(phrase)) {
      seen.add(phrase);
      const row =
        k.data && Array.isArray(k.data) ? k.data : [k.keyword, k.category];
      found.push({
        keyword: phrase,
        category: k.category || "Other",
        meaning: k.meaning || "",
        priority: k.priority || "Medium",
        language: k.language || "Darija",
        data: row,
        headers: k.headers || null,
        listName: k.listName || "",
      });
      keyword_data[phrase] = {
        keyword: phrase,
        category: k.category || "Other",
        meaning: k.meaning || "",
        priority: k.priority || "Medium",
        language: k.language || "Darija",
        row,
        headers: k.headers || null,
      };
    }
  }

  // ✅ 2. Match single words (keyword by keyword) with PRIORITY:
  //    Column A first → Column B → other variants.
  for (const word of words) {
    if (seen.has(word)) continue;

    // Search Column A first
    let match = lookupA.get(word);
    // If not found in Column A, search Column B
    if (!match) match = lookupB.get(word);
    // If still not found, search other variant columns
    if (!match) match = lookupOther.get(word);

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
        headers: match.headers || null,
        listName: match.listName || "",
      });

      keyword_data[word] = {
        keyword: word,
        category: match.category || "Other",
        meaning: match.meaning || "",
        priority: match.priority || "Medium",
        language: match.language || "Darija",
        row,
        headers: match.headers || null,
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
 * Get the value of a specific column (by header name) from a keyword's row.
 * Returns the raw cell value, or "" if not found.
 */
function getColumnValue(k, names) {
  if (!Array.isArray(k.headers) || !Array.isArray(k.data)) return "";
  const nameList = Array.isArray(names) ? names : [names];
  for (let idx = 0; idx < k.headers.length; idx++) {
    const h = String(k.headers[idx]).toLowerCase().trim();
    if (nameList.includes(h)) {
      return k.data[idx] || "";
    }
  }
  return "";
}

/**
 * Split a variant cell into individual words (pipe `|`, bullet `•`, comma `,`).
 */
function splitVariants(value) {
  return String(value)
    .toLowerCase()
    .split(/[|•·,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
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
      try {
        const { keywords = [] } = await getKeywordsForList(
          keywordListId.toString(),
        );
        const result = detectKeywordsInText(message, keywords);

        console.log(
          `🔍 detectKeywordsForProduct: list=${keywordListId} keywords=${keywords.length} message="${message}" found=${result.detected_keywords.length}`,
        );

        // Attach the list name to each found keyword
        result.found = result.found.map((k) => ({ ...k, listName }));
        // Rebuild keyword_data with listName too
        Object.keys(result.keyword_data).forEach((w) => {
          result.keyword_data[w].listName = listName;
        });

        // If the product's list found nothing, fall through to search
        // across ALL active keyword lists (in case the product's list
        // is empty, misconfigured, or the keyword lives in another list).
        if (result.detected_keywords.length > 0) {
          return result;
        }
      } catch (listError) {
        console.error(
          `⚠️ Product list ${keywordListId} failed, searching all lists:`,
          listError.message,
        );
      }
    }

    // ✅ Fallback 1: search across ALL active keyword lists
    try {
      const activeLists = await getActiveKeywordLists();
      const allKeywords = [];

      for (const list of activeLists) {
        try {
          const { keywords = [] } = await getKeywordsForList(
            list._id.toString(),
          );
          keywords.forEach((k) => {
            const kw = String(k.keyword).toLowerCase().trim();
            if (!kw) return;
            allKeywords.push({ ...k, listName: list.name });
          });
        } catch (e) {
          // Skip lists that fail to load
          continue;
        }
      }

      if (allKeywords.length > 0) {
        const result = detectKeywordsInText(message, allKeywords);
        if (result.detected_keywords.length > 0) {
          console.log(
            `🔍 detectKeywordsForProduct: found ${result.detected_keywords.length} keywords across ${activeLists.length} active lists`,
          );
          return result;
        }
      }
    } catch (crossError) {
      console.error("⚠️ Cross-list keyword search error:", crossError.message);
    }

    // ✅ Fallback 2: global master sheet
    console.log(
      `🔍 detectKeywordsForProduct: NO keyword_list_id on product "${listName}" — falling back to master sheet`,
    );
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
