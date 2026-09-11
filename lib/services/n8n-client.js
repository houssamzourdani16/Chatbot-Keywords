// lib/services/n8n-client.js
import "server-only";

/**
 * ============================================
 * ✅ N8N WEBHOOK CLIENT
 * ============================================
 *
 * Sends a joined conversation to an N8N webhook and returns the AI response.
 * Includes retry logic for transient failures.
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Mask a webhook URL for logging so we don't leak query params / secrets.
 * Shows scheme + host + path, hides any query string.
 */
function maskUrl(url) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return String(url).split("?")[0];
  }
}

/**
 * Send a conversation to an N8N webhook.
 *
 * Builds a clean, well-organized payload with clear sections so the AI
 * agent in n8n can easily understand the context.
 *
 * @param {Object} options
 * @param {string} options.webhookUrl - The N8N webhook URL
 * @param {string} options.product_id - The product id
 * @param {string} options.sender_id - The customer sender id
 * @param {Array}  options.conversation - Array of { sender_id, message, platform, received_at }
 * @param {Object} options.product - The full product (catalog details)
 * @param {Object} options.extra - Extra data (keywords, lead, etc.)
 * @returns {Promise<{ok: boolean, status: number, data: any, error?: string}>}
 */
export async function sendToN8N({
  webhookUrl,
  product_id,
  sender_id,
  conversation,
  product = null,
  extra = {},
}) {
  if (!webhookUrl) {
    return { ok: false, status: 0, error: "No webhook URL provided" };
  }

  // ✅ Build a clean, organized payload with clear sections so the AI
  //    agent in n8n has EVERYTHING it needs in one place.
  const payload = {
    // ===== 1. CUSTOMER =====
    customer: {
      id: sender_id,
    },

    // ===== 1b. ACCESS TOKEN (for replying on behalf of the page) =====
    //    Each page has its own access token, stored on the product. It is
    //    passed here so the AI agent in n8n can send replies back to the
    //    customer using the correct page's token.
    access_token: extra.access_token || product?.access_token || "",

    // ===== 2. PRODUCT (FULL CATALOG DETAILS) =====
    product: {
      id: product_id,
      name: product?.name || null,
      price: product?.price || null,
      compare_price: product?.compare_price || null,
      currency: "DZD",
      quantity: product?.quantity || null,
      description: product?.description || "",
      description_ar: product?.description_ar || "",
      category: product?.category || "",
      subcategory: product?.subcategory || "",
      name_ar: product?.name_ar || "",
      name_fr: product?.name_fr || "",
      stock_status: product?.stock_status || "",
      status: product?.status || "",
      min_quantity: product?.min_quantity || 1,
      material: product?.material || "",
      origin: product?.origin || "",
      weight: product?.weight || "",
      care: product?.care || "",
      warranty: product?.warranty || "",
      features: product?.features || [],
      usp: product?.usp || "",
      target_audience: product?.target_audience || "",
      season: product?.season || "",
      occasion: product?.occasion || "",
      tags: product?.tags || [],
      colors: product?.colors || [],
      sizes: product?.sizes || [],
      images: product?.images || {},
      sku_base: product?.sku_base || "",
      barcode: product?.barcode || "",
      supplier: product?.supplier || "",
      conversion_rate: product?.conversion_rate || "",
      avg_quantity_per_order: product?.avg_quantity_per_order || "",
      common_combos: product?.common_combos || "",
      related_products: product?.related_products || [],
    },

    // ===== 3. CONVERSATION (CURRENT MESSAGES) =====
    conversation: {
      // The full joined text (all messages from this sender)
      full_text: extra.full_conversation || "",
      // The individual messages in order (clean strings)
      messages:
        extra.raw_messages && extra.raw_messages.length
          ? extra.raw_messages
          : conversation.map((c) => ({
              sender_id: c.sender_id,
              text: String(c.message || c.incoming_message || ""),
              platform: c.platform || null,
              received_at: c.received_at,
            })),
      message_count: conversation.length,
    },

    // ===== 4. KEYWORDS DETECTED =====
    keywords: {
      // Simple list of detected keyword strings
      detected: extra.detected_keywords || [],
      // Full details for each keyword (all spreadsheet columns)
      details: extra.keyword_data || {},
      // Detailed detection results (found/unfound)
      results: extra.keywords_detected || [],
      unfound: extra.unfound_keywords || [],
    },

    // ===== 5. CONVERSATION HISTORY (past messages from the database) =====
    conversation_history: {
      // All past messages for this sender
      messages: extra.conversation_history || [],
      // Whether any history was found for this sender
      found: extra.conversation_history_found || false,
      // Which sources contributed history
      sources: extra.conversation_history_sources || [],
    },

    // ===== 6. LEAD (if detected) =====
    lead: extra.lead_detected || null,

    // ===== 7. METADATA =====
    metadata: {
      batch_id: extra.batch_id || null,
      waiting_time: extra.waiting_time || 0,
      sent_at: new Date().toISOString(),
    },
  };

  // ✅ ENHANCE: For each detected keyword, add an explicit `row_data` object
  //    that maps each spreadsheet header → value. This makes the FULL row
  //    trivially accessible in n8n (e.g. {{ $json.keywords.details.واش.row_data.category }})
  //    instead of having to zip the headers + row arrays manually.
  const details = payload.keywords.details;
  if (details && typeof details === "object") {
    Object.keys(details).forEach((kw) => {
      const entry = details[kw];
      if (!entry || typeof entry !== "object") return;
      const headers = Array.isArray(entry.headers) ? entry.headers : [];
      const row = Array.isArray(entry.row) ? entry.row : [];
      const rowData = {};
      headers.forEach((h, idx) => {
        if (h && idx < row.length) {
          rowData[String(h).trim()] = row[idx];
        }
      });
      // ✅ Attach the header→value map to the keyword entry
      entry.row_data = rowData;
    });
  }

  let lastError = null;
  let lastStatus = 0;

  // ✅ Log the destination (masked) so we can verify which webhook is used.
  console.log(
    `📤 sendToN8N → ${maskUrl(webhookUrl)} | sender=${sender_id} | ` +
      `messages=${conversation.length} | payload=${JSON.stringify(payload).length} bytes`,
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Give N8N time to process (AI can be slow)
        signal: AbortSignal.timeout(30000),
      });

      lastStatus = response.status;

      if (response.ok) {
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          // Response wasn't JSON — capture text
          data = await response.text().catch(() => null);
        }
        console.log(
          `✅ sendToN8N OK (attempt ${attempt}) → HTTP ${response.status}`,
        );
        return { ok: true, status: response.status, data, payload };
      }

      lastError = `HTTP ${response.status}`;
      console.log(
        `⚠️ sendToN8N attempt ${attempt}/${MAX_RETRIES} → HTTP ${response.status} (non-2xx)`,
      );
    } catch (error) {
      lastError = error.message;
      console.log(
        `❌ sendToN8N attempt ${attempt}/${MAX_RETRIES} threw: ${error.message}`,
      );
    }

    // Wait before retrying (except on last attempt)
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt),
      );
    }
  }

  console.log(
    `🚫 sendToN8N FAILED after ${MAX_RETRIES} attempts → status=${lastStatus} error=${lastError}`,
  );
  return { ok: false, status: lastStatus, error: lastError, payload };
}
