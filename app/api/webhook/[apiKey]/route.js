// app/api/webhook/[apiKey]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import { addMessageToBatch } from "@/lib/services/batch-service";
import { detectKeywordsForProduct } from "@/lib/services/keyword-detection.service";
import { processBatch } from "@/lib/services/batch-processor";

// ✅ Allow the function to run up to 60s so the awaited batch processing
//    (wait time + processing) completes before Vercel kills the function.
//    Without this, Vercel's default 10s limit would terminate the function
//    mid-processing and the batch would never be sent.
export const maxDuration = 60;

// ============================================
// ✅ FASTER PROCESSING
//    After saving a message, we schedule the
//    batch processor to run shortly after the
//    debounce window expires. This makes messages
//    reach n8n in ~seconds instead of waiting for
//    the 1-minute cron. If a new message resets
//    the timer, the processor skips the batch.
// ============================================

// ============================================
// ✅ META / FACEBOOK WEBHOOK VERIFICATION (GET)
//    Facebook sends a GET request with:
//      ?hub.mode=subscribe
//      &hub.verify_token=<META_VERIFY_TOKEN>
//      &hub.challenge=<random>
//    We must reply with the challenge as PLAIN TEXT
//    (status 200) when the token matches — anything
//    else (300+, JSON body) makes Facebook's
//    verification fail with #N/A errors.
// ============================================
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log("🔍 Webhook verification request:", {
    mode,
    token,
    challenge,
  });

  // Meta always uses mode === "subscribe" for verification
  if (mode === "subscribe" && challenge) {
    const verifyToken = process.env.META_VERIFY_TOKEN || "";

    // ✅ ALSO accept the fallback so verification works even if the
    //    env var isn't deployed yet. Trim both sides to avoid
    //    subtle whitespace mismatches from copy/paste.
    const acceptedTokens = [verifyToken, "your_verify_token_here"]
      .map((t) => t?.trim())
      .filter(Boolean);

    if (token && acceptedTokens.includes(token.trim())) {
      console.log("✅ Verification successful!");
      // MUST return the raw challenge as text/plain, no JSON wrapper
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.log("❌ Verification failed: Token mismatch", {
      received: token,
      expected: verifyToken,
    });
    return new Response("Verification failed - token mismatch", {
      status: 403,
    });
  }

  // Not a verification request → method not allowed / bad request
  return new Response(
    "Webhook is for Facebook/Meta verification. Use POST to send messages.",
    { status: 200, headers: { "Content-Type": "text/plain" } },
  );
}

export async function POST(request, { params }) {
  try {
    await dbConnect();

    // ✅ Next.js 15+: params must be awaited
    const { apiKey } = await params;

    // ✅ Preload the product query NOW (overlaps with JSON parsing below)
    const productPromise = Product.findOne({ api_key: apiKey });

    // ✅ Capture the FULL payload as raw_data (can hold anything)
    const data = await request.json();

    // ============================================
    // ✅ Extract message text, supporting:
    //    - Simple format: { message: "hello", sender_id: "x" }
    //    - Meta/Facebook format:
    //        entry[0].messaging[0].message.text
    //        entry[0].messaging[0].sender.id
    // ============================================
    const metaEntry = data?.entry?.[0]?.messaging?.[0];
    const metaMessage = metaEntry?.message?.text;

    // Extract the message text (support both simple and Meta formats)
    const message = metaMessage || data.message || data.text;

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
    //    Supports both simple format (data.sender_id)
    //    and Meta/Facebook format
    //    (metaEntry.sender.id).
    // ============================================
    const sender_id = metaEntry?.sender?.id || data.sender_id;
    if (!sender_id) {
      return NextResponse.json(
        { error: "sender_id is required for batching" },
        { status: 400 },
      );
    }

    // ============================================
    // ✅ 4. Detect keywords (Step 5 of the spec)
    //    Check the message against the product's
    //    linked keyword list (Google Sheet) and
    //    store the detected keywords + full row data
    //    on the message record itself.
    // ============================================
    let detectedKeywords = [];
    let keywordData = {};
    try {
      const detection = await detectKeywordsForProduct({
        productId: product._id,
        message,
        productOverride: product,
      });
      detectedKeywords = detection.detected_keywords || [];
      keywordData = detection.keyword_data || {};
    } catch (kwError) {
      // Non-fatal: keyword detection should not block message ingestion
      console.error("⚠️ Per-message keyword detection error:", kwError.message);
    }

    // ============================================
    // ✅ 5. Add message to a debounced batch
    //    - Uses product.waiting_time (default 5s)
    //    - Resets the timer if same sender sends again
    // ============================================
    const { batch, message: savedMessage } = await addMessageToBatch({
      user_id: owner._id,
      product_id: product._id,
      sender_id,
      messageData: data,
      waiting_time: product.waiting_time || 5,
      incoming_message: message,
      detected_keywords: detectedKeywords,
      keyword_data: keywordData,
    });

    console.log(
      `💾 Message ${savedMessage._id} added to batch ${batch._id} for sender ${sender_id}` +
        (detectedKeywords.length
          ? ` | 🏷 keywords: ${detectedKeywords.join(", ")}`
          : " | 🏷 no keywords detected"),
    );

    // ============================================
    // ✅ 5. AWAIT the batch processing. We wait for the product's
    //    wait time to expire, then process the batch DIRECTLY in this
    //    function. This keeps the function alive until the batch is
    //    processed — reliable on BOTH local and serverless (Vercel),
    //    where a fire-and-forget setTimeout would be frozen after the
    //    response is returned.
    //
    //    The debounce still works correctly: processBatch re-reads the
    //    batch's expires_at from the DB and SKIPS it if a newer message
    //    from the same sender reset the timer. The cron
    //    (`/api/batches/process` every minute) remains as a safety net.
    // ============================================
    await scheduleBatchProcessing(batch.expires_at, batch._id);

    return NextResponse.json({
      success: true,
      message: "✅ Webhook received successfully",
      message_id: savedMessage._id,
      batch_id: batch._id,
      mode: "prod",
      detected_keywords: detectedKeywords,
      keyword_data: keywordData,
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
 * Fire-and-forget: wait for the debounce window to expire, then process
 * the batch DIRECTLY (in-process) so the workflow continues reliably —
 * even on serverless where `setTimeout` + a separate HTTP call may not
 * fire. If a new message resets the timer, the processor will simply
 * skip the batch (it won't be expired yet).
 */
async function scheduleBatchProcessing(expiresAt, batchId) {
  try {
    const now = Date.now();
    const delay = Math.max(0, new Date(expiresAt).getTime() - now) + 1000;

    // Wait for the debounce window to expire (+1s buffer)
    await new Promise((resolve) => setTimeout(resolve, delay));

    // ✅ Process the batch directly (in-process). This is reliable and
    //    doesn't depend on a separate HTTP call or the cron.
    await processBatch(batchId);
  } catch (error) {
    // Non-fatal: the Vercel cron will retry. Log and continue.
    console.error("⚠️ scheduleBatchProcessing failed:", error.message);
  }
}
