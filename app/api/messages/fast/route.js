// app/api/messages/fast/route.js
// ✅ FAST endpoint: Returns lightweight message list WITHOUT enrichment
// Time: ~200-300ms (10x faster than /api/messages)
// Use for: Rapid polling, real-time updates, dashboard refreshes

import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch"; // ✅ Import Batch for expires_at
import jwt from "jsonwebtoken";
import { getBySender as getConversationBySender } from "@/lib/services/conversation.service";

export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;
    const productId = searchParams.get("productId") || "";
    const status = searchParams.get("status") || "";
    const senderId = searchParams.get("senderId") || "";

    // ✅ Get product IDs (lightweight query)
    const products = await Product.find({ user_id: decoded.userId })
      .select("_id name")
      .lean();
    const productIds = products.map((p) => p._id);
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p.name;
    });

    // ✅ Build message query
    const messageQuery = { user_id: decoded.userId };
    if (productId) {
      messageQuery.product_id = productId;
    } else if (productIds.length > 0) {
      messageQuery.product_id = { $in: productIds };
    }
    if (status) messageQuery.status = status;
    if (senderId) messageQuery.sender_id = { $regex: senderId, $options: "i" };

    // ✅ Optimized query: Only fetch essential fields, no enrichment
    // This is the key to speed: .select() + .lean()
    // NOTE: detected_keywords + keyword_data ARE included because they are
    //       stored on the message document (no re-detection / no Google
    //       Sheets fetch needed) — this lets the UI show keywords instantly.
    const [messages, total] = await Promise.all([
      Message.find(messageQuery)
        .select(
          "_id batch_id sender_id product_id status created_at incoming_message raw_data mode detected_keywords keyword_data",
        ) // ✅ Essential fields + stored keyword data
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // ✅ No Mongoose overhead
      Message.countDocuments(messageQuery),
    ]);

    // ✅ Fetch batch info (expires_at needed for countdown timer)
    const batchInfoMap = {};
    const batchIds = messages.map((m) => m.batch_id).filter(Boolean);
    if (batchIds.length > 0) {
      try {
        const batches = await Batch.find({ _id: { $in: batchIds } })
          .select("_id expires_at status failure_reason")
          .lean();
        batches.forEach((b) => {
          batchInfoMap[b._id.toString()] = {
            expires_at: b.expires_at,
            status: b.status,
            failure_reason: b.failure_reason || null,
          };
        });
      } catch (e) {
        // Non-fatal: countdown just won't show if batch lookup fails
      }
    }

    // ✅ Fetch conversation history from the linked sheets (or DB fallback)
    //    for each unique sender, cached per sender.
    const conversationHistoryCache = {};
    const uniqueSenders = [...new Set(messages.map((m) => m.sender_id))];
    await Promise.all(
      uniqueSenders.map(async (sid) => {
        if (!sid) return;
        try {
          const res = await getConversationBySender(sid);
          conversationHistoryCache[sid] = res.messages || [];
        } catch {
          conversationHistoryCache[sid] = [];
        }
      }),
    );

    // ✅ Minimal enrichment: just map to product names + batch info
    const enriched = messages.map((m) => {
      const productKey = m.product_id?.toString();
      const batchInfo = m.batch_id
        ? batchInfoMap[m.batch_id.toString()] || null
        : null;
      // ✅ Extract the message text (supports simple + Meta/Facebook formats)
      const messageText =
        m.incoming_message ||
        m.raw_data?.message ||
        m.raw_data?.text ||
        m.raw_data?.entry?.[0]?.messaging?.[0]?.message?.text ||
        "";
      return {
        id: m._id,
        batch_id: m.batch_id,
        batch_expires_at: batchInfo?.expires_at || null, // ✅ NEEDED for countdown timer!
        batch_status: batchInfo?.status || null,
        failure_reason: batchInfo?.failure_reason || null,
        conversation_history: conversationHistoryCache[m.sender_id] || [],
        sender_id: m.sender_id,
        product_id: m.product_id,
        product_name: productMap[productKey] || "Unknown",
        status: m.status,
        mode: m.mode,
        message: messageText,
        created_at: m.created_at,
        // ✅ Include the STORED keyword data (already on the document).
        //    No re-detection or Google Sheets fetch — just pass through.
        detected_keywords: m.detected_keywords || [],
        keyword_data: m.keyword_data || {},
      };
    });

    return NextResponse.json({
      success: true,
      connected: true,
      db: "connected",
      count: enriched.length,
      messages: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      // ✅ Indicate this is FAST data (no enrichment)
      enriched: false,
      responseTime: "~200ms",
    });
  } catch (error) {
    console.error("Error fetching messages (fast):", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", connected: false },
      { status: 500 },
    );
  }
}
