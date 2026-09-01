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
  deleteBatchMessages,
} from "@/lib/services/batch-service";
import { detectKeywordsForProduct } from "@/lib/services/keyword-detection.service";
import { processLeadDetection } from "@/lib/services/lead-service";
import { sendToN8N } from "@/lib/services/n8n-client";
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
export async function processBatch(batchId) {
  await dbConnect();

  // ✅ Only process the batch if its debounce timer has EXPIRED. This
  //    prevents an earlier scheduled call from processing a batch whose
  //    timer was reset by a newer message from the same sender.
  const existing = await Batch.findById(batchId).lean();
  if (!existing) return null;
  if (existing.status !== "open") return null; // already processed/claimed
  if (new Date(existing.expires_at).getTime() > Date.now()) {
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
    //    3. BATCH_WEBHOOK_URL env var
    // ============================================
    let destinationUrl = process.env.BATCH_WEBHOOK_URL;
    try {
      const product = await Product.findById(batch.product_id).lean();
      if (product) {
        if (product.webhook_model_id) {
          const model = await WebhookModel.findById(
            product.webhook_model_id,
          ).lean();
          if (model?.webhook_url) {
            destinationUrl = model.webhook_url;
          }
        }
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

    if (!destinationUrl) {
      await failBatch(batch._id);
      await failBatchMessages(batch._id);
      return {
        batch_id: batch._id,
        status: "failed",
        reason: "No destination webhook URL configured",
      };
    }

    const sendResult = await sendToN8N({
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
      },
    });

    if (!sendResult.ok) {
      // ❌ Webhook failed → KEEP messages, mark them failed
      await failBatch(batch._id);
      await failBatchMessages(batch._id);
      return {
        batch_id: batch._id,
        status: "failed",
        reason: `Webhook returned ${sendResult.status}`,
      };
    }

    // ✅ Webhook succeeded → mark batch + messages completed, then DELETE
    //    the processed messages (they were joined and delivered to n8n).
    await completeBatch(batch._id);
    await completeBatchMessages(batch._id);
    const deletedIds = await deleteBatchMessages(batch._id);

    console.log(
      `✅ Marked ${conversation.length} messages completed for batch ${batch._id}`,
    );
    console.log(
      `🗑️ Deleted ${deletedIds.length} processed messages for batch ${batch._id}`,
    );

    return {
      batch_id: batch._id,
      status: "completed",
      message_count: conversation.length,
      deleted_count: deletedIds.length,
    };
  } catch (error) {
    // Unexpected error → keep messages, mark them failed
    await failBatch(batch._id);
    await failBatchMessages(batch._id);
    return {
      batch_id: batch._id,
      status: "failed",
      reason: error.message,
    };
  }
}
