// app/api/batches/process/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import {
  getExpiredBatches,
  claimBatch,
  completeBatch,
  getBatchConversation,
  deleteBatchMessages,
  failBatchMessages,
  failBatch,
} from "@/lib/services/batch-service";
import { processMessageKeywords } from "@/lib/services/google-sheets";
import { detectKeywordsForProduct } from "@/lib/services/keyword-detection.service";
import { processLeadDetection } from "@/lib/services/lead-service";
import { sendToN8N } from "@/lib/services/n8n-client";
import Product from "@/lib/models/product";
import WebhookModel from "@/lib/models/webhook-model";

/**
 * ============================================
 * ✅ BATCH PROCESSING ENDPOINT
 * ============================================
 *
 * This endpoint finds all batches whose debounce timer has expired,
 * joins their messages into a conversation, and sends the conversation
 * to the configured destination webhook.
 *
 * It is designed to be called by a cron job / scheduler (e.g. every
 * few seconds) OR manually via a GET request.
 *
 * Destination webhook URL is configured via env var:
 *   BATCH_WEBHOOK_URL=https://your-app.com/api/process-batch
 *
 * You can also set a per-product webhook_url later (the Product model
 * already has a webhook_url field).
 */

// Optional: protect this endpoint with a secret so only your scheduler can call it
const PROCESS_SECRET = process.env.BATCH_PROCESS_SECRET;

export async function GET(request) {
  try {
    // Optional auth check
    if (PROCESS_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${PROCESS_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    await dbConnect();

    // 1. Find expired, open batches
    const expiredBatches = await getExpiredBatches(20);

    if (expiredBatches.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No batches ready to process",
      });
    }

    // 2. Process each batch in parallel
    const results = await Promise.all(
      expiredBatches.map(async (batch) => {
        // Claim the batch atomically (prevents double-processing)
        const claimed = await claimBatch(batch._id);
        if (!claimed) {
          // Someone else already claimed it — skip
          return null;
        }

        try {
          // Join all messages into a conversation (does NOT delete)
          const conversation = await getBatchConversation(batch._id);

          // ============================================
          // ✅ KEYWORD DETECTION (Google Sheets)
          //    Extract keywords from the conversation,
          //    look up meanings in the product's selected
          //    keyword list (Google Sheet), and append any
          //    unfound keywords to the new sheet.
          //    (Steps 7 & 8: build full_conversation + all
          //     detected keywords + keyword_data.)
          // ============================================
          let keywordResults = { found: [], unfound: [] };
          let allDetectedKeywords = [];
          let allKeywordData = {};
          try {
            // ✅ STEP 7: Join all messages into one string
            const allText = conversation
              .map((c) => c.message || c.incoming_message || "")
              .join(" ");

            // Resolve the product's selected keyword list
            const product = await Product.findById(batch.product_id).lean();

            // If the product has its own keyword list, use the shared
            // detection service so per-message AND batch detection agree.
            if (product?.keyword_list_id) {
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
            } else {
              // Fall back to the global master sheet
              keywordResults = await processMessageKeywords(allText);
              allDetectedKeywords = keywordResults.found.map((k) => k.keyword);
              keywordResults.found.forEach((k) => {
                allKeywordData[k.keyword] = {
                  keyword: k.keyword,
                  category: k.category,
                  meaning: k.meaning || "",
                  priority: k.priority || "Medium",
                  language: k.language || "Darija",
                  listName: product?.name || "",
                };
              });
              allKeywordData = allKeywordData || {};
            }
          } catch (kwError) {
            // Non-fatal: keyword detection should not block message sending
            console.error("⚠️ Keyword detection error:", kwError.message);
          }

          // ============================================
          // ✅ LEAD DETECTION
          //    Detect lead info (name, phone, email, etc.)
          //    from the conversation and create/update a
          //    lead record for this customer + product.
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
          //    1. The N8N webhook model the user selected
          //       (product.webhook_model_id → WebhookModel.webhook_url)
          //    2. The product's own webhook_url
          //    3. The global BATCH_WEBHOOK_URL env var
          // ============================================
          let destinationUrl = process.env.BATCH_WEBHOOK_URL;

          try {
            const product = await Product.findById(batch.product_id).lean();
            if (product) {
              // 1. Selected N8N webhook model
              if (product.webhook_model_id) {
                const model = await WebhookModel.findById(
                  product.webhook_model_id,
                ).lean();
                if (model?.webhook_url) {
                  destinationUrl = model.webhook_url;
                }
              }
              // 2. Product's own webhook_url
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
            // No destination configured yet — mark as failed so it can be retried
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
              // ✅ STEP 7: Full joined conversation string
              full_conversation: conversation
                .map((c) => c.message || c.incoming_message || "")
                .join(" "),
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

          // ✅ Webhook succeeded → mark batch complete, then DELETE messages
          await completeBatch(batch._id);
          const deletedIds = await deleteBatchMessages(batch._id);

          console.log(
            `🗑️ Deleted ${deletedIds.length} messages for batch ${batch._id}`,
          );

          return {
            batch_id: batch._id,
            status: "completed",
            message_count: conversation.length,
            deleted_message_ids: deletedIds,
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
      }),
    );

    const filteredResults = results.filter(Boolean);

    return NextResponse.json({
      success: true,
      processed: filteredResults.length,
      results: filteredResults,
    });
  } catch (error) {
    console.error("❌ Batch processing error:", error);
    return NextResponse.json(
      { error: "Failed to process batches" },
      { status: 500 },
    );
  }
}
