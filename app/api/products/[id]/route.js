// app/api/products/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import WebhookModel from "@/lib/models/webhook-model";
import KeywordList from "@/lib/models/keyword-list";
import jwt from "jsonwebtoken";

// GET - Fetch a single product with usage stats (owned by the user)
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = await params;

    // Ensure the product belongs to this user
    const product = await Product.findOne({
      _id: id,
      user_id: decoded.userId,
    }).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Usage stats
    const [totalMessages, testCount, prodCount, completedCount, failedCount] =
      await Promise.all([
        Message.countDocuments({ product_id: id }),
        Message.countDocuments({ product_id: id, mode: "test" }),
        Message.countDocuments({ product_id: id, mode: "prod" }),
        Message.countDocuments({ product_id: id, status: "completed" }),
        Message.countDocuments({ product_id: id, status: "failed" }),
      ]);

    const successRate =
      totalMessages > 0
        ? Math.round(((totalMessages - failedCount) / totalMessages) * 100)
        : 100;

    // Recent messages
    const recentMessages = await Message.find({ product_id: id })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    const enrichedMessages = recentMessages.map((m) => ({
      id: m._id,
      sender_id: m.sender_id,
      message:
        m.raw_data?.message || m.raw_data?.text || JSON.stringify(m.raw_data),
      platform: m.raw_data?.platform || null,
      status: m.status,
      mode: m.mode,
      created_at: m.created_at,
    }));

    // Resolve the selected webhook model name
    let webhookModelName = null;
    if (product.webhook_model_id) {
      const model = await WebhookModel.findById(
        product.webhook_model_id,
      ).select("name");
      webhookModelName = model?.name || null;
    }

    // Resolve the selected keyword list name
    let keywordListName = null;
    if (product.keyword_list_id) {
      const list = await KeywordList.findById(product.keyword_list_id).select(
        "name dialect",
      );
      keywordListName = list?.name || null;
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        webhookModelName,
        keywordListName,
        stats: {
          totalMessages,
          testCount,
          prodCount,
          completedCount,
          failedCount,
          successRate,
          avgResponseTime: product.waiting_time || 7,
        },
      },
      messages: enrichedMessages,
    });
  } catch (error) {
    console.error("Error fetching product detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}
