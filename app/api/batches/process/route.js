// app/api/batches/process/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import { getExpiredBatches } from "@/lib/services/batch-service";
import { processBatch } from "@/lib/services/batch-processor";

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

    // 2. Process each batch in parallel (shared logic in batch-processor)
    const results = await Promise.all(
      expiredBatches.map(async (batch) => {
        return processBatch(batch._id);
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
