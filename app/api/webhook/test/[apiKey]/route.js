// app/api/webhook/test/[apiKey]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";

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

    // ✅ Now save message (depends on product)
    const newMessage = new Message({
      user_id: product.user_id,
      product_id: product._id,
      raw_data: data,
      mode: "test",
      status: "received",
      created_at: new Date(),
    });

    await newMessage.save(); // ← Line 40 fixed!

    console.log(`💾 Test message saved with ID: ${newMessage._id}`);

    return NextResponse.json({
      success: true,
      message: "✅ Test webhook received successfully",
      message_id: newMessage._id,
      mode: "test",
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
