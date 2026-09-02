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
 * @param {Object} options.extra - Extra data (keywords, lead, etc.)
 * @returns {Promise<{ok: boolean, status: number, data: any, error?: string}>}
 */
export async function sendToN8N({
  webhookUrl,
  product_id,
  sender_id,
  conversation,
  extra = {},
}) {
  if (!webhookUrl) {
    return { ok: false, status: 0, error: "No webhook URL provided" };
  }

  // ✅ Build a clean, organized payload with clear sections.
  const payload = {
    // ===== 1. CUSTOMER =====
    customer: {
      id: sender_id,
    },

    // ===== 2. PRODUCT =====
    product: {
      id: product_id,
    },

    // ===== 3. CONVERSATION =====
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

    // ===== 5. LEAD (if detected) =====
    lead: extra.lead_detected || null,

    // ===== 6. METADATA =====
    metadata: {
      batch_id: extra.batch_id || null,
      waiting_time: extra.waiting_time || 0,
      sent_at: new Date().toISOString(),
    },
  };

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Give N8N time to process (AI can be slow)
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          // Response wasn't JSON — capture text
          data = await response.text().catch(() => null);
        }
        return { ok: true, status: response.status, data, payload };
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }

    // Wait before retrying (except on last attempt)
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt),
      );
    }
  }

  return { ok: false, status: 0, error: lastError, payload };
}
