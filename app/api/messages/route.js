// app/api/messages/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import jwt from "jsonwebtoken";

// GET - Fetch the latest messages for the logged-in user across all their
// products, with live status. Used by the dashboard "Live Messages" panel.
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
    const productId = searchParams.get("productId") || "";

    // Get the user's products (to map product_id -> name)
    const products = await Product.find({ user_id: decoded.userId })
      .select("_id name")
      .lean();
    const productIds = products.map((p) => p._id);
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p.name;
    });

    // Build the message query
    const messageQuery = { user_id: decoded.userId };
    if (productId) {
      messageQuery.product_id = productId;
    } else if (productIds.length > 0) {
      messageQuery.product_id = { $in: productIds };
    }

    const messages = await Message.find(messageQuery)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    const enriched = messages.map((m) => ({
      id: m._id,
      product_id: m.product_id,
      product_name: productMap[m.product_id?.toString()] || "Unknown",
      sender_id: m.sender_id,
      message:
        m.raw_data?.message ||
        m.raw_data?.text ||
        m.incoming_message ||
        JSON.stringify(m.raw_data),
      platform: m.raw_data?.platform || null,
      status: m.status,
      mode: m.mode,
      detected_keywords: m.detected_keywords || [],
      created_at: m.created_at,
    }));

    // Connection status: if we reached here, the DB is connected.
    return NextResponse.json({
      success: true,
      connected: true,
      db: "connected",
      count: enriched.length,
      messages: enriched,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", connected: false },
      { status: 500 },
    );
  }
}
