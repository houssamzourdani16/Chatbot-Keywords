// app/api/admin/products/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - List all products (with pagination, search, filter)
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (status) {
      query.status = status;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Get owner names
    const userIds = [...new Set(products.map((p) => p.user_id))];
    const users = await User.find({ _id: { $in: userIds } }).select(
      "name email",
    );
    const userMap = {};
    users.forEach((u) => (userMap[u._id] = u));

    const enriched = await Promise.all(
      products.map(async (p) => {
        const messageCount = await Message.countDocuments({
          product_id: p._id,
        });
        const batchCount = await Batch.countDocuments({ product_id: p._id });
        return {
          id: p._id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
          description: p.description,
          api_key: p.api_key,
          webhook_url: p.webhook_url,
          waiting_time: p.waiting_time,
          status: p.status || "Active",
          created_at: p.created_at,
          owner: userMap[p.user_id]
            ? {
                id: p.user_id,
                name: userMap[p.user_id].name,
                email: userMap[p.user_id].email,
              }
            : null,
          messageCount,
          batchCount,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      products: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a product and its messages/batches
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await Promise.all([
      Message.deleteMany({ product_id: productId }),
      Batch.deleteMany({ product_id: productId }),
      Product.findByIdAndDelete(productId),
    ]);

    return NextResponse.json({
      success: true,
      message: `Deleted product "${product.name}" and its data`,
    });
  } catch (error) {
    console.error("Admin delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
