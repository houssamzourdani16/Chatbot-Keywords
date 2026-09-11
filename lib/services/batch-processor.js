// lib/services/batch-processor.js
import "server-only";
import dbConnect from "@/lib/database/database";
import {
  claimBatch,
  completeBatch,
  getBatchConversation,
  completeBatchMessages,
  failBatchMessages,
  failBatch,
} from "@/lib/services/batch-service";
import { detectKeywordsForProduct } from "@/lib/services/keyword-detection.service";
import { processLeadDetection } from "@/lib/services/lead-service";
import { sendToN8N } from "@/lib/services/n8n-client";
import {
  getBySender as getConversationBySender,
  saveMessage as saveConversationMessage,
} from "@/lib/services/conversation.service";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch";
import WebhookModel from "@/lib/models/webhook-model";

/**
 * ============================================
 * ✅ BATCH PROCESSOR (shared logic)
 * ============================================
 *
 * Processes a SINGLE batch: joins its messages into a conversation,
 * detects keywords + lead, resolves the destination n8n webhook, and
 * sends the organized payload.
 *
 * Used by BOTH:
 *   - The cron endpoint (`/api/batches/process`) for expired batches
 *   - The webhook route (after the debounce window) for immediate
 *     processing — so the workflow continues reliably even on serverless
 *     where `setTimeout` may not fire.
 */

/**
 * Process a single batch by id.
 * Returns { batch_id, status, message_count?, reason? }
 */
export async function processBatch(batchId, { force = false } = {}) {
  await dbConnect();

  // ✅ Only process the batch if its debounce timer has EXPIRED. This
  //    prevents an earlier scheduled call from processing a batch whose
  //    timer was reset by a newer message from the same sender.
  const existing = await Batch.findById(batchId).lean();
  if (!existing) return null;
  if (existing.status !== "open") return null; // already processed/claimed
  if (!force && new Date(existing.expires_at).getTime() > Date.now()) {
    // Not expired yet — a newer message reset the timer. Skip.
    return null;
  }

  // Claim the batch atomically (prevents double-processing)
  const batch = await claimBatch(batchId);
  if (!batch) {
    // Someone else already claimed it — skip
    return null;
  }

  try {
    // Join all messages into a conversation (does NOT delete)
    const conversation = await getBatchConversation(batch._id);

    // ============================================
    // ✅ KEYWORD DETECTION (Google Sheets)
    // ============================================
    let keywordResults = { found: [], unfound: [] };
    let allDetectedKeywords = [];
    let allKeywordData = {};
    try {
      // ✅ STEP 7: Join all messages into one string (clean strings)
      const allText = conversation
        .map((c) => String(c.message || c.incoming_message || ""))
        .filter(Boolean)
        .join(" ");
      const product = await Product.findById(batch.product_id).lean();

      const detection = await detectKeywordsForProduct({
        productId: batch.product_id,
        message: allText,
        productOverride: product,
      });
      keywordResults = {
        found: detection.found,
        unfound: detection.unfound || [],
      };
      allDetectedKeywords = detection.detected_keywords || [];
      allKeywordData = detection.keyword_data || {};

      // ✅ Persist detected keywords back onto each message record
      if (allDetectedKeywords.length > 0) {
        await Message.updateMany(
          { batch_id: batch._id },
          {
            $set: {
              detected_keywords: allDetectedKeywords,
              keyword_data: allKeywordData,
            },
          },
        );
      }
    } catch (kwError) {
      // Non-fatal: keyword detection should not block message sending
      console.error("⚠️ Keyword detection error:", kwError.message);
    }

    // ============================================
    // ✅ LEAD DETECTION
    // ============================================
    let lead = null;
    try {
      lead = await processLeadDetection({
        user_id: batch.user_id,
        product_id: batch.product_id,
        customer_id: batch.sender_id,
        conversation,
      });
    } catch (leadError) {
      // Non-fatal: lead detection should not block message sending
      console.error("⚠️ Lead detection error:", leadError.message);
    }

    // ============================================
    // ✅ RESOLVE DESTINATION WEBHOOK
    //    Priority:
    //    1. product.webhook_model_id → WebhookModel.webhook_url
    //    2. product.webhook_url
    //    3. BATCH_WEBHOOK_URL env var (fallback)
    // ============================================
    let destinationUrl = null;
    try {
      const product = await Product.findById(batch.product_id).lean();
      if (product) {
        // ✅ Priority 1: the product's linked AI model webhook
        if (product.webhook_model_id) {
          const model = await WebhookModel.findById(
            product.webhook_model_id,
          ).lean();
          if (model?.webhook_url) {
            destinationUrl = model.webhook_url;
          }
        }
        // ✅ Priority 2: the product's own webhook URL
        if (!destinationUrl && product.webhook_url) {
          destinationUrl = product.webhook_url;
        }
      }
    } catch (resolveError) {
      console.error(
        "⚠️ Failed to resolve webhook model:",
        resolveError.message,
      );
    }

    // ✅ Priority 3: fall back to the global BATCH_WEBHOOK_URL env var
    //    ONLY if the product has no webhook configured.
    if (!destinationUrl) {
      destinationUrl = process.env.BATCH_WEBHOOK_URL;
    }

    if (!destinationUrl) {
      const reason = "No destination webhook URL configured";
      console.log(
        `🚫 Batch ${batch._id} (product=${batch.product_id}, sender=${batch.sender_id}) ` +
          `has NO destination webhook URL. Check product.webhook_model_id, ` +
          `product.webhook_url, or BATCH_WEBHOOK_URL env var.`,
      );
      await failBatch(batch._id, reason);
      await failBatchMessages(batch._id);
      return {
        batch_id: batch._id,
        status: "failed",
        reason,
      };
    }

    console.log(
      `🎯 Batch ${batch._id} → destination webhook resolved: ${destinationUrl.split("?")[0]}`,
    );

    // ============================================
    // ✅ CONVERSATION HISTORY (MongoDB)
    //    Before calling n8n, read the sender's FULL past conversation
    //    history from the database. This gives the AI in n8n complete
    //    context of everything this sender has said.
    //    Non-fatal: if this fails, we still send.
    // ============================================
    let conversationHistory = { messages: [], found: false, sources: [] };
    try {
      conversationHistory = await getConversationBySender(batch.sender_id);
    } catch (historyError) {
      // Non-fatal: conversation history should not block message sending
      console.error("⚠️ Conversation history error:", historyError.message);
    }

    // ============================================
    // ✅ SAVE MESSAGES TO CONVERSATION HISTORY (MongoDB)
    //    When a message arrives, save it to the conversation collection
    //    keyed by sender_id so we can retrieve the full history later.
    //    Non-fatal: if this fails, we still send to n8n.
    // ============================================
    try {
      for (const msg of conversation) {
        const text = String(msg.message || msg.incoming_message || "").trim();
        if (text) {
          await saveConversationMessage({
            user_id: batch.user_id,
            product_id: batch.product_id,
            sender_id: batch.sender_id,
            message: text,
            raw_data: msg.raw_data || null,
            mode: batch.mode || "prod",
          });
        }
      }
    } catch (archiveError) {
      console.error(
        "⚠️ Save conversation message error:",
        archiveError.message,
      );
    }

    let sendResult = await sendToN8N({
      webhookUrl: destinationUrl,
      product_id: batch.product_id,
      sender_id: batch.sender_id,
      conversation,
      extra: {
        batch_id: batch._id,
        waiting_time: batch.waiting_time,
        message_count: conversation.length,
        // ✅ STEP 7: Full joined conversation string (clean strings)
        full_conversation: conversation
          .map((c) => String(c.message || c.incoming_message || ""))
          .filter(Boolean)
          .join(" "),
        // ✅ The full incoming messages as they arrived
        raw_messages: conversation.map((c) => ({
          sender_id: c.sender_id,
          text: String(c.message || c.incoming_message || ""),
          platform: c.platform || null,
          received_at: c.received_at,
        })),
        // ✅ All keywords detected across the whole batch
        detected_keywords: allDetectedKeywords,
        keyword_data: allKeywordData,
        // ✅ Detailed keyword detection results for n8n
        keywords_detected: keywordResults.found,
        unfound_keywords: keywordResults.unfound,
        // ✅ Include lead detection result for n8n
        lead_detected: lead
          ? {
              id: lead._id,
              extracted_data: lead.extracted_data,
              confidence_score: lead.confidence_score,
              status: lead.status,
            }
          : null,
        // ✅ Full past conversation history from the linked sheets
        conversation_history: conversationHistory.messages,
        conversation_history_found: conversationHistory.found,
        conversation_history_sources: conversationHistory.sources,
      },
    });

    // ✅ FALLBACK: If the product's webhook failed (non-2xx) AND a global
    //    BATCH_WEBHOOK_URL env var is configured, retry with the env var.
    //    This ensures the process CONTINUES and reaches a working webhook
    //    even if the product's configured webhook is broken/unreachable.
    if (!sendResult.ok && process.env.BATCH_WEBHOOK_URL) {
      const fallbackUrl = process.env.BATCH_WEBHOOK_URL;
      if (fallbackUrl && fallbackUrl !== destinationUrl) {
        console.log(
          `⚠️ Product webhook failed (${sendResult.status}). ` +
            `Retrying with BATCH_WEBHOOK_URL fallback...`,
        );
        sendResult = await sendToN8N({
          webhookUrl: fallbackUrl,
          product_id: batch.product_id,
          sender_id: batch.sender_id,
          conversation,
          extra: {
            batch_id: batch._id,
            waiting_time: batch.waiting_time,
            message_count: conversation.length,
            full_conversation: conversation
              .map((c) => String(c.message || c.incoming_message || ""))
              .filter(Boolean)
              .join(" "),
            raw_messages: conversation.map((c) => ({
              sender_id: c.sender_id,
              text: String(c.message || c.incoming_message || ""),
              platform: c.platform || null,
              received_at: c.received_at,
            })),
            detected_keywords: allDetectedKeywords,
            keyword_data: allKeywordData,
            keywords_detected: keywordResults.found,
            unfound_keywords: keywordResults.unfound,
            lead_detected: lead
              ? {
                  id: lead._id,
                  extracted_data: lead.extracted_data,
                  confidence_score: lead.confidence_score,
                  status: lead.status,
                }
              : null,
            conversation_history: conversationHistory.messages,
            conversation_history_found: conversationHistory.found,
            conversation_history_sources: conversationHistory.sources,
          },
        });
        // ✅ If the fallback succeeded, use the fallback URL as the
        //    destination for the stored payload.
        if (sendResult.ok) {
          destinationUrl = fallbackUrl;
        }
      }
    }

    if (!sendResult.ok) {
      // ❌ Webhook failed → KEEP messages, mark them failed
      const reason = sendResult.error
        ? `Webhook failed: ${sendResult.error}`
        : `Webhook returned ${sendResult.status}`;
      await failBatch(batch._id, reason);
      await failBatchMessages(batch._id);
      return {
        batch_id: batch._id,
        status: "failed",
        reason,
      };
    }

    // ✅ Webhook succeeded → mark batch completed. We KEEP the processed
    //    messages in the DB (marked "completed") so they show up on the
    //    messages page. They were already delivered to n8n, but the user
    //    wants to see the saved messages in the UI.
    await completeBatch(batch._id);

    // ✅ Store the FULL outgoing payload on the batch so the UI can show
    //    exactly what was sent to n8n.
    if (sendResult.payload) {
      await Batch.findByIdAndUpdate(batch._id, {
        sent_payload: {
          ...sendResult.payload,
          webhookUrl: destinationUrl,
          executionMode: "production",
        },
      });
    }

    // ✅ Mark the processed messages as "completed" (KEEP them in the DB
    //    so they appear on the messages page). The full outgoing payload is
    //    stored on the batch and surfaced via the API.
    await completeBatchMessages(batch._id);

    console.log(
      `✅ Sent ${conversation.length} messages for batch ${batch._id} and ` +
        `marked ${conversation.length} message(s) as completed`,
    );

    return {
      batch_id: batch._id,
      status: "completed",
      message_count: conversation.length,
    };
  } catch (error) {
    // Unexpected error → keep messages, mark them failed
    const reason = error?.message || "Unexpected processing error";
    await failBatch(batch._id, reason);
    await failBatchMessages(batch._id);
    return {
      batch_id: batch._id,
      status: "failed",
      reason,
    };
  }
}
