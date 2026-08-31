// app/api/products/[id]/messages/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import jwt from "jsonwebtoken";

// GET - Fetch messages for a specific product (owned by the user)
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
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const messages = await Message.find({ product_id: id })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

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
    });
  } catch (error) {
    console.error("Error fetching product messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}
