// app/api/webhook/[apiKey]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import { addMessageToBatch } from "@/lib/services/batch-service";

// ============================================
// ✅ FASTER PROCESSING
//    After saving a message, we schedule the
//    batch processor to run shortly after the
//    debounce window expires. This makes messages
//    reach n8n in ~seconds instead of waiting for
//    the 1-minute cron. If a new message resets
//    the timer, the processor skips the batch.
// ============================================

export async function POST(request, { params }) {
  try {
    await dbConnect();

    // ✅ Next.js 15+: params must be awaited
    const { apiKey } = await params;

    // ✅ Preload the product query NOW (overlaps with JSON parsing below)
    const productPromise = Product.findOne({ api_key: apiKey });

    // ✅ Capture the FULL payload as raw_data (can hold anything)
    const data = await request.json();

    // Extract the message text (support both `message` and `text` keys)
    const message = data.message || data.text;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // ============================================
    // ✅ 1. Validate the API key against the DB
    // ============================================
    const product = await productPromise;

    if (!product) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // ============================================
    // ✅ 2. Get the product owner
    // ============================================
    const owner = await User.findById(product.user_id);

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    // ============================================
    // ✅ 3. Require a sender_id (needed for batching)
    // ============================================
    const sender_id = data.sender_id;
    if (!sender_id) {
      return NextResponse.json(
        { error: "sender_id is required for batching" },
        { status: 400 },
      );
    }

    // ============================================
    // ✅ 4. Add message to a debounced batch
    //    - Uses product.waiting_time (default 5s)
    //    - Resets the timer if same sender sends again
    // ============================================
    const { batch, message: savedMessage } = await addMessageToBatch({
      user_id: owner._id,
      product_id: product._id,
      sender_id,
      messageData: data,
      waiting_time: product.waiting_time || 5,
    });

    console.log(
      `💾 Message ${savedMessage._id} added to batch ${batch._id} for sender ${sender_id}`,
    );

    // ============================================
    // ✅ 5. Return immediately — just save the message.
    //    No waiting, no processing here. The messages
    //    are stored in the database and will be
    //    processed later (by the scheduler / cron).
    // ============================================

    // ✅ Schedule faster processing (fire-and-forget)
    scheduleBatchProcessing(batch.expires_at);

    return NextResponse.json({
      success: true,
      message: "✅ Webhook received successfully",
      message_id: savedMessage._id,
      batch_id: batch._id,
      mode: "prod",
      batch_will_send_at: batch.expires_at,
      product: {
        id: product._id,
        name: product.name,
      },
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

/**
 * Fire-and-forget: schedule the batch processor to run shortly after
 * the debounce window expires. Uses the internal base URL so it works
 * both locally and on Vercel. If a new message resets the timer, the
 * processor will simply skip the batch (it won't be expired yet).
 */
async function scheduleBatchProcessing(expiresAt) {
  try {
    const now = Date.now();
    const delay = Math.max(0, new Date(expiresAt).getTime() - now) + 1000;

    // Wait for the debounce window to expire (+1s buffer)
    await new Promise((resolve) => setTimeout(resolve, delay));

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";

    const url = `${baseUrl}/api/batches/process`;

    await fetch(url, {
      method: "GET",
      headers: {
        // Pass the secret if configured, so the processor accepts the call
        ...(process.env.BATCH_PROCESS_SECRET
          ? { Authorization: `Bearer ${process.env.BATCH_PROCESS_SECRET}` }
          : {}),
      },
    });
  } catch (error) {
    // Non-fatal: the Vercel cron will retry. Log and continue.
    console.error("⚠️ scheduleBatchProcessing failed:", error.message);
  }
}
