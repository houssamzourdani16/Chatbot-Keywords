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

  const payload = {
    product_id,
    sender_id,
    conversation,
    message_count: conversation.length,
    ...extra,
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
        return { ok: true, status: response.status, data };
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

  return { ok: false, status: 0, error: lastError };
}
