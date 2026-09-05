// app/api/webhook/[apiKey]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import Message from "@/lib/models/message";
import Setting from "@/lib/models/setting";
import { addMessageToBatch } from "@/lib/services/batch-service";
import { detectKeywordsForProduct } from "@/lib/services/keyword-detection.service";
import { processBatch } from "@/lib/services/batch-processor";

// ✅ No timers. The batch is processed directly and awaited within this
//    request, so it reliably reaches n8n on both local and serverless
//    (Vercel) without relying on setTimeout or a cron.
export const maxDuration = 60;

// ✅ Read the daily PRODUCTION-call limit from the admin Settings.
//    Super admins can change it in Admin → Settings → Webhook Settings.
const DEFAULT_PROD_LIMIT = 10000;
async function getProdLimit() {
  try {
    const setting = await Setting.findOne({ key: "prod_calls_per_day" }).lean();
    const value = parseInt(setting?.value, 10);
    if (Number.isFinite(value) && value > 0) return value;
  } catch (err) {
    console.error("⚠️ Failed to read prod_calls_per_day:", err.message);
  }
  return DEFAULT_PROD_LIMIT;
}

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
export async function GET(request, { params }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log("🔍 Webhook verification request:", {
    mode,
    token: token ? "***" : null,
    challenge,
  });

  // Meta always uses mode === "subscribe" for verification
  if (mode === "subscribe" && challenge) {
    const verifyToken = process.env.META_VERIFY_TOKEN || "";

    // ✅ The webhook is per PRODUCT (apiKey in the URL). Look up the
    //    product's owner so we can accept the owner's personal verify
    //    token — one token per user, usable on ALL their products.
    let ownerAcceptedToken = null;
    try {
      const { apiKey } = await params;
      await dbConnect();
      const product = await Product.findOne({ api_key: apiKey });
      if (product) {
        const owner = await User.findById(product.user_id);
        ownerAcceptedToken = owner?.verifyToken || null;
      }
    } catch (err) {
      console.error("⚠️ Failed to look up owner verify token:", err.message);
    }

    const acceptedTokens = [
      verifyToken,
      ownerAcceptedToken,
      "your_verify_token_here",
    ]
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
    const prodLimitPromise = getProdLimit(); // read admin setting in parallel

    // ✅ Capture the FULL payload as raw_data (can hold anything)
    const data = await request.json();

    // ============================================
    // ✅ Extract message text, supporting:
    //    - Simple format: { message: "hello", sender_id: "x" }
    //    - Meta/Facebook format:
    //        entry[0].messaging[0].message.text
    //        entry[0].messaging[0].sender.id
    //
    //    IMPORTANT: A single Meta payload can contain MULTIPLE messages
    //    in entry[0].messaging[]. We collect ALL of them so every message
    //    from the same sender is added to the SAME batch with the SAME
    //    wait time, and processed together.
    // ============================================
    const messagingEntries = data?.entry?.[0]?.messaging || [];

    // Build a list of { sender_id, message } for every message in the payload.
    const messagesToProcess = [];
    if (messagingEntries.length > 0) {
      // Meta/Facebook format: iterate over ALL messaging entries
      messagingEntries.forEach((entry) => {
        const text = entry?.message?.text;
        const sender = entry?.sender?.id;
        if (text && sender) {
          messagesToProcess.push({ sender_id: sender, message: text });
        }
      });
    } else if (data.message || data.text) {
      // Simple format: { message: "hello", sender_id: "x" }
      messagesToProcess.push({
        sender_id: data.sender_id,
        message: data.message || data.text,
      });
    }

    if (messagesToProcess.length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // ============================================
    // ✅ 1. Validate the API key against the DB
    // ============================================
    const [product, DAILY_LIMIT] = await Promise.all([
      productPromise,
      prodLimitPromise,
    ]);

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
    // ✅ 2b. RATE LIMIT (production): configurable daily
    //    limit per product (Admin → Settings → Webhook).
    // ============================================
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayProd = await Message.countDocuments({
      product_id: product._id,
      mode: "prod",
      created_at: { $gte: startOfDay },
    });

    if (todayProd >= DAILY_LIMIT) {
      console.log(
        `🚫 Prod rate limit reached for ${product.name}: ${todayProd}/${DAILY_LIMIT} today`,
      );
      return NextResponse.json(
        {
          error: `Production rate limit exceeded. Maximum ${DAILY_LIMIT} calls per day.`,
          used: todayProd,
          limit: DAILY_LIMIT,
          resetsAt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
        { status: 429 },
      );
    }

    // ============================================
    // ✅ 3. Process EVERY message from the payload.
    //    Each message is added to the SAME batch for its (product, sender).
    //    Because addMessageToBatch RESETS the batch's expires_at on every
    //    call, all messages from the same sender share the SAME wait time
    //    and are processed together when the timer finally expires.
    // ============================================
    let lastBatch = null;
    let lastSavedMessage = null;
    let allDetectedKeywords = [];
    let allKeywordData = {};

    for (const item of messagesToProcess) {
      const { sender_id, message } = item;

      if (!sender_id) {
        // Skip messages without a sender (can't batch them)
        continue;
      }

      // ✅ 4. Detect keywords for this message
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
        console.error(
          "⚠️ Per-message keyword detection error:",
          kwError.message,
        );
      }

      // ✅ 5. Add message to a debounced batch
      //    - Uses product.waiting_time (default 7s)
      //    - RESETS the timer if same sender sends again
      const { batch, message: savedMessage } = await addMessageToBatch({
        user_id: owner._id,
        product_id: product._id,
        sender_id,
        messageData: data,
        waiting_time: product.waiting_time || 7,
        incoming_message: message,
        detected_keywords: detectedKeywords,
        keyword_data: keywordData,
      });

      lastBatch = batch;
      lastSavedMessage = savedMessage;
      allDetectedKeywords = allDetectedKeywords.concat(detectedKeywords);
      allKeywordData = { ...allKeywordData, ...keywordData };

      console.log(
        `💾 Message ${savedMessage._id} added to batch ${batch._id} for sender ${sender_id}` +
          (detectedKeywords.length
            ? ` | 🏷 keywords: ${detectedKeywords.join(", ")}`
            : " | 🏷 no keywords detected"),
      );
    }

    if (!lastBatch || !lastSavedMessage) {
      return NextResponse.json(
        { error: "No valid messages to process" },
        { status: 400 },
      );
    }

    // ============================================
    // ✅ 6. PROCESS THE BATCH DIRECTLY (no timers)
    //    We save the messages, then process the batch right here. All
    //    messages that landed in this batch (grouped by product+sender) get
    //    joined, keywords + lead detected, and sent to n8n. processBatch
    //    re-reads the batch state from the DB so nothing is double-processed.
    // ============================================
    await processBatch(lastBatch._id, { force: true });

    return NextResponse.json({
      success: true,
      message: "✅ Messages saved and sent to n8n",
      message_id: lastSavedMessage._id,
      batch_id: lastBatch._id,
      mode: "prod",
      detected_keywords: allDetectedKeywords,
      keyword_data: allKeywordData,
      batch_will_send_at: lastBatch.expires_at,
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
