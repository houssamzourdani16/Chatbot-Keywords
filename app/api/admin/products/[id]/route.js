// app/api/admin/products/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import User from "@/lib/models/user";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch";
import { verifyAdmin } from "@/lib/auth/admin";

// GET - Single product with details
export async function GET(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const owner = await User.findById(product.user_id).select("name email");

    const [messageCount, batchCount, testCount, prodCount] = await Promise.all([
      Message.countDocuments({ product_id: id }),
      Batch.countDocuments({ product_id: id }),
      Message.countDocuments({ product_id: id, mode: "test" }),
      Message.countDocuments({ product_id: id, mode: "prod" }),
    ]);

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        owner: owner ? { name: owner.name, email: owner.email } : null,
        messageCount,
        batchCount,
        testCount,
        prodCount,
      },
    });
  } catch (error) {
    console.error("Admin product detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// PUT - Update product
export async function PUT(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update allowed fields
    const allowed = [
      "name",
      "price",
      "quantity",
      "description",
      "waiting_time",
      "status",
      "category",
      "subcategory",
      "name_ar",
      "name_fr",
      "compare_price",
      "stock_status",
      "min_quantity",
      "description_ar",
      "material",
      "origin",
      "weight",
      "care",
      "warranty",
      "usp",
      "target_audience",
      "season",
      "occasion",
      "sku_base",
      "barcode",
      "supplier",
      "reorder_point",
      "location",
      "mode",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        product[key] = body[key];
      }
    }

    await product.save();

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Admin update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

// DELETE - Delete product
export async function DELETE(request, { params }) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await Promise.all([
      Message.deleteMany({ product_id: id }),
      Batch.deleteMany({ product_id: id }),
      Product.findByIdAndDelete(id),
    ]);

    return NextResponse.json({
      success: true,
      message: `Deleted product "${product.name}"`,
    });
  } catch (error) {
    console.error("Admin delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
