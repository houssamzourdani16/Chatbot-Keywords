// app/api/webhook/test/[apiKey]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import Message from "@/lib/models/message";
import { addMessageToBatch } from "@/lib/services/batch-service";
import { detectKeywordsForProduct } from "@/lib/services/keyword-detection.service";
import { processBatch } from "@/lib/services/batch-processor";

// ✅ No timers. The batch is processed directly and awaited within this
//    request, so it reliably reaches n8n without relying on setTimeout.
export const maxDuration = 60;

// ============================================
// ✅ META / FACEBOOK WEBHOOK VERIFICATION (GET)
//    Handles the GET hub.challenge verification
//    sent by Facebook/Meta so the TEST webhook can
//    be connected in the Meta developer dashboard.
// ============================================
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log("🔍 TEST webhook verification request:", {
    mode,
    token,
    challenge,
  });

  if (mode === "subscribe" && challenge) {
    const verifyToken = process.env.META_VERIFY_TOKEN || "";
    const acceptedTokens = [verifyToken, "your_verify_token_here"]
      .map((t) => t?.trim())
      .filter(Boolean);

    if (token && acceptedTokens.includes(token.trim())) {
      console.log("✅ TEST verification successful!");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.log("❌ TEST verification failed: Token mismatch", {
      received: token,
      expected: verifyToken,
    });
    return new Response("Verification failed - token mismatch", {
      status: 403,
    });
  }

  return new Response(
    "Test webhook is for Facebook/Meta verification. Use POST to send messages.",
    { status: 200, headers: { "Content-Type": "text/plain" } },
  );
}

export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { apiKey } = await params;
    const data = await request.json();

    if (!data.message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    console.log(`🧪 TEST webhook called with API Key: ${apiKey}`);

    // ============================================
    // ✅ FIX: Preload product (start loading NOW!)
    // ============================================
    const productPromise = Product.findOne({ api_key: apiKey }); // ← Line 24 fixed!

    // Do any other work that doesn't need product...
    // (like validation, preparing data, etc.)

    // Now await product
    const product = await productPromise; // ← Now await it

    if (!product) {
      console.log("❌ Product not found for API Key:", apiKey);
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    console.log(`✅ Product found: ${product.name}`);

    // ============================================
    // ✅ RATE LIMIT: Max 5 test calls per day
    // ============================================
    const DAILY_LIMIT = 5;

    // Start of today (local time)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Count how many test messages this product has today
    const todayCount = await Message.countDocuments({
      product_id: product._id,
      mode: "test",
      created_at: { $gte: startOfDay },
    });

    if (todayCount >= DAILY_LIMIT) {
      console.log(
        `🚫 Rate limit reached for product ${product.name}: ${todayCount}/${DAILY_LIMIT} today`,
      );
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Maximum ${DAILY_LIMIT} test calls per day.`,
          used: todayCount,
          limit: DAILY_LIMIT,
          resetsAt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
        { status: 429 },
      );
    }

    // ============================================
    // ✅ Get the product owner
    // ============================================
    const owner = await User.findById(product.user_id);
    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    // ============================================
    // ✅ Detect keywords (same as production webhook)
    // ============================================
    let detectedKeywords = [];
    let keywordData = {};
    try {
      const detection = await detectKeywordsForProduct({
        productId: product._id,
        message: data.message,
        productOverride: product,
      });
      detectedKeywords = detection.detected_keywords || [];
      keywordData = detection.keyword_data || {};
    } catch (kwError) {
      // Non-fatal
      console.error("⚠️ Test keyword detection error:", kwError.message);
    }

    // ============================================
    // ✅ Add message to a debounced batch (same as
    //    production webhook) so it gets sent to n8n
    //    after the product's waiting_time expires.
    // ============================================
    const sender_id = data.sender_id || "test_sender";
    const { batch, message: savedMessage } = await addMessageToBatch({
      user_id: owner._id,
      product_id: product._id,
      sender_id,
      messageData: data,
      waiting_time: product.waiting_time || 7,
      incoming_message: data.message,
      detected_keywords: detectedKeywords,
      keyword_data: keywordData,
    });

    // ✅ Mark the message as TEST mode (addMessageToBatch defaults to prod)
    savedMessage.mode = "test";
    await savedMessage.save();

    console.log(
      `💾 Test message ${savedMessage._id} added to batch ${batch._id} for sender ${sender_id}`,
    );

    // ✅ Process the batch DIRECTLY (no timers). The message is already
    //    saved and added to its batch; processBatch joins the batch's
    //    messages, detects keywords + lead, and sends them to n8n. It
    //    re-reads the batch state from the DB so nothing is double-processed.
    await processBatch(batch._id, { force: true });

    return NextResponse.json({
      success: true,
      message: "✅ Test webhook received successfully",
      message_id: savedMessage._id,
      batch_id: batch._id,
      mode: "test",
      batch_will_send_at: batch.expires_at,
      detected_keywords: detectedKeywords,
      product: {
        id: product._id,
        name: product.name,
      },
    });
  } catch (error) {
    console.error("❌ Test webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process test webhook" },
      { status: 500 },
    );
  }
}
