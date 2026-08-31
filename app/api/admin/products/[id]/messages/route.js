// app/api/admin/products/[id]/messages/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - Messages for a specific product
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const product = await Product.findById(id).select("name");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ product_id: id })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ product_id: id }),
    ]);

    const enriched = messages.map((m) => ({
      id: m._id,
      sender_id: m.sender_id,
      message:
        m.raw_data?.message || m.raw_data?.text || JSON.stringify(m.raw_data),
      platform: m.raw_data?.platform || null,
      status: m.status,
      mode: m.mode,
      created_at: m.created_at,
    }));

    return NextResponse.json({
      success: true,
      product: { id: product._id, name: product.name },
      messages: enriched,
      count: enriched.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin product messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}
