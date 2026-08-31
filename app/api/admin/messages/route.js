// app/api/admin/messages/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Message from "@/lib/models/message";
import Product from "@/lib/models/product";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - List all messages (with optional sender filter)
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const senderId = searchParams.get("senderId") || "";
    const productId = searchParams.get("productId") || "";
    const mode = searchParams.get("mode") || "";
    const status = searchParams.get("status") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const query = {};
    if (senderId) query.sender_id = { $regex: senderId, $options: "i" };
    if (productId) query.product_id = productId;
    if (mode) query.mode = mode;
    if (status) query.status = status;
    if (from || to) {
      query.created_at = {};
      if (from) query.created_at.$gte = new Date(from);
      if (to) query.created_at.$lte = new Date(to);
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(query),
    ]);

    // Enrich with product info
    const productIds = [...new Set(messages.map((m) => m.product_id))];
    const products = await Product.find({ _id: { $in: productIds } }).select(
      "name",
    );
    const productMap = {};
    products.forEach((p) => (productMap[p._id] = p.name));

    const enriched = messages.map((m) => ({
      id: m._id,
      sender_id: m.sender_id,
      product_id: m.product_id,
      product_name: productMap[m.product_id] || "Unknown",
      message:
        m.raw_data?.message || m.raw_data?.text || JSON.stringify(m.raw_data),
      platform: m.raw_data?.platform || null,
      status: m.status,
      mode: m.mode,
      created_at: m.created_at,
    }));

    return NextResponse.json({
      success: true,
      messages: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a message (or all messages from a sender)
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const senderId = searchParams.get("senderId");

    await dbConnect();

    if (messageId) {
      await Message.findByIdAndDelete(messageId);
      return NextResponse.json({
        success: true,
        message: "Message deleted",
      });
    }

    if (senderId) {
      const result = await Message.deleteMany({ sender_id: senderId });
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} messages from ${senderId}`,
      });
    }

    return NextResponse.json(
      { error: "messageId or senderId is required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Admin delete message error:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 },
    );
  }
}
