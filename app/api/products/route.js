// app/api/products/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import { revalidatePath } from "next/cache";
import jwt from "jsonwebtoken";
import { resolveWaitingTime } from "@/lib/services/waiting-time.service";

// ============================================
// ✅ GENERATE API KEY
// ============================================
function generateApiKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "pk_";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// ✅ GET - Fetch all products
// ============================================
export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const products = await Product.find({ user_id: decoded.userId }).sort({
      created_at: -1,
    });

    // ✅ Count webhook calls (messages) per product, split by mode
    const productsWithStats = await Promise.all(
      products.map(async (p) => {
        const [totalCalls, testCalls, prodCalls] = await Promise.all([
          Message.countDocuments({ product_id: p._id }),
          Message.countDocuments({ product_id: p._id, mode: "test" }),
          Message.countDocuments({ product_id: p._id, mode: "prod" }),
        ]);

        return {
          ...p.toObject(),
          webhook_calls: totalCalls,
          webhook_calls_test: testCalls,
          webhook_calls_prod: prodCalls,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      products: productsWithStats,
      count: productsWithStats.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// ============================================
// ✅ POST - Create product (ONLY ONE!)
// ============================================
export async function POST(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const {
      name,
      price,
      quantity,
      description,
      webhook_url,
      webhook_url_test,
      waiting_time,
      category,
      subcategory,
      name_ar,
      name_fr,
      compare_price,
      stock_status,
      status,
      min_quantity,
      description_ar,
      images,
      colors,
      sizes,
      material,
      origin,
      weight,
      care,
      warranty,
      features,
      usp,
      target_audience,
      season,
      occasion,
      tags,
      conversion_rate,
      avg_quantity_per_order,
      common_combos,
      related_products,
      sku_base,
      barcode,
      supplier,
      reorder_point,
      location,
    } = await request.json();

    if (!name || !price || !quantity) {
      return NextResponse.json(
        { error: "Name, price, and quantity are required" },
        { status: 400 },
      );
    }

    // ============================================
    // ✅ GENERATE UNIQUE API KEY
    // ============================================
    let apiKey = generateApiKey();
    let existingProduct = await Product.findOne({ api_key: apiKey });
    let attempts = 0;
    const maxAttempts = 10;

    console.log(`🔑 Generating unique API key...`);
    console.log(`🔑 First key: ${apiKey}`);

    while (existingProduct && attempts < maxAttempts) {
      console.log(`⚠️ Collision: ${apiKey} - trying again...`);
      apiKey = generateApiKey();
      console.log(`🔑 New key: ${apiKey}`);
      existingProduct = await Product.findOne({ api_key: apiKey });
      attempts++;
    }

    if (existingProduct) {
      console.error(`❌ Failed after ${maxAttempts} attempts`);
      return NextResponse.json(
        { error: "Failed to generate unique API key. Please try again." },
        { status: 400 },
      );
    }

    console.log(`✅ Unique API key generated: ${apiKey}`);

    // ✅ Resolve the waiting time from Settings (default + max clamp).
    //    The destructured `waiting_time` above holds the raw form value;
    //    `resolvedWaitingTime` is the validated value (default + clamp).
    const resolvedWaitingTime = await resolveWaitingTime(waiting_time ?? null);

    // Create product
    const product = new Product({
      user_id: decoded.userId,
      name,
      price,
      quantity,
      description: description || "",
      api_key: apiKey,
      webhook_url: webhook_url || undefined,
      webhook_url_test: webhook_url_test || undefined,
      waiting_time: resolvedWaitingTime,
      mode: "test", // ✅ Default to TEST mode
      category: category || "",
      subcategory: subcategory || "",
      name_ar: name_ar || "",
      name_fr: name_fr || "",
      compare_price: compare_price || null,
      stock_status: stock_status || "High",
      status: status || "Active",
      min_quantity: min_quantity || 1,
      description_ar: description_ar || "",
      images: images || {},
      colors: colors || [],
      sizes: sizes || [],
      material: material || "",
      origin: origin || "",
      weight: weight || "",
      care: care || "",
      warranty: warranty || "",
      features: features || [],
      usp: usp || "",
      target_audience: target_audience || "",
      season: season || "All",
      occasion: occasion || "",
      tags: tags || [],
      conversion_rate: conversion_rate || "",
      avg_quantity_per_order: avg_quantity_per_order || "",
      common_combos: common_combos || "",
      related_products: related_products || [],
      sku_base: sku_base || "",
      barcode: barcode || "",
      supplier: supplier || "",
      reorder_point: reorder_point || "",
      location: location || "",
    });

    await product.save();

    console.log(`✅ Product saved: ${product.name}`);

    revalidatePath("/dashboard");
    revalidatePath("/products");

    return NextResponse.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        description: product.description,
        api_key: product.api_key,
        webhook_url: product.webhook_url,
        webhook_url_test: product.webhook_url_test,
        waiting_time: product.waiting_time,
        mode: product.mode,
        created_at: product.created_at,
      },
    });
  } catch (error) {
    console.error("❌ Error creating product:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "API key collision. Please try again." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: 500 },
    );
  }
}

// ============================================
// ✅ PATCH - Toggle product mode (test/prod)
// ============================================
export async function PATCH(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId, mode } = await request.json();

    if (!productId || !mode) {
      return NextResponse.json(
        { error: "productId and mode are required" },
        { status: 400 },
      );
    }

    if (!["test", "prod"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be 'test' or 'prod'" },
        { status: 400 },
      );
    }

    // Ensure the product belongs to this user
    const product = await Product.findOneAndUpdate(
      { _id: productId, user_id: decoded.userId },
      { mode },
      { new: true },
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        mode: product.mode,
      },
    });
  } catch (error) {
    console.error("Error toggling product mode:", error);
    return NextResponse.json(
      { error: "Failed to toggle product mode" },
      { status: 500 },
    );
  }
}
