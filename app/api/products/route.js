// app/api/products/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import Setting from "@/lib/models/setting";
import { revalidatePath } from "next/cache";
import jwt from "jsonwebtoken";
import { resolveWaitingTime } from "@/lib/services/waiting-time.service";

// ✅ Daily limits (matching the webhook routes). Read from admin Settings.
const DEFAULT_TEST_LIMIT = 25;
const DEFAULT_PROD_LIMIT = 10000;

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

    // Read the daily test/prod limits from admin Settings (with defaults).
    let testLimit = DEFAULT_TEST_LIMIT;
    let prodLimit = DEFAULT_PROD_LIMIT;
    try {
      const settings = await Setting.find({}).lean();
      settings.forEach((s) => {
        if (s.key === "test_calls_per_day") {
          const v = parseInt(s.value, 10);
          if (Number.isFinite(v) && v > 0) testLimit = v;
        }
        if (s.key === "prod_calls_per_day") {
          const v = parseInt(s.value, 10);
          if (Number.isFinite(v) && v > 0) prodLimit = v;
        }
      });
    } catch (err) {
      console.error("⚠️ Failed to read daily limits:", err.message);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const products = await Product.find({ user_id: decoded.userId }).sort({
      created_at: -1,
    });

    // ✅ Use the product's PERSISTENT webhook call counters (incremented on
    //    every webhook call) as the source of truth for lifetime stats.
    //    Also counts how many were used TODAY against the daily limits.
    const productsWithStats = await Promise.all(
      products.map(async (p) => {
        const [testToday, prodToday] = await Promise.all([
          Message.countDocuments({
            product_id: p._id,
            mode: "test",
            created_at: { $gte: startOfDay },
          }),
          Message.countDocuments({
            product_id: p._id,
            mode: "prod",
            created_at: { $gte: startOfDay },
          }),
        ]);

        return {
          ...p.toObject(),
          // ✅ Persistent counters stored on the product (incremented in the
          //    webhook routes). Fall back to 0 if not yet set.
          webhook_calls: p.webhook_calls || 0,
          webhook_calls_test: p.webhook_calls_test || 0,
          webhook_calls_prod: p.webhook_calls_prod || 0,
          test_calls_today: testToday,
          prod_calls_today: prodToday,
          test_calls_limit: testLimit,
          prod_calls_limit: prodLimit,
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
      waiting_time_enabled,
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
    //    If wait time is DISABLED the stored value is 0 (instant send).
    const resolvedWaitingTime =
      waiting_time_enabled === false
        ? 0
        : await resolveWaitingTime(waiting_time ?? null);

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
      waiting_time_enabled: waiting_time_enabled !== false,
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
// ✅ PATCH - Toggle product mode (test/prod) OR webhook enabled/disabled
// ============================================
export async function PATCH(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId, mode, enabled } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    // Build the update — allow toggling mode and/or enabled.
    const update = {};
    if (mode !== undefined) {
      if (!["test", "prod"].includes(mode)) {
        return NextResponse.json(
          { error: "mode must be 'test' or 'prod'" },
          { status: 400 },
        );
      }
      update.mode = mode;
    }
    if (enabled !== undefined) {
      update.enabled = Boolean(enabled);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Ensure the product belongs to this user
    const product = await Product.findOneAndUpdate(
      { _id: productId, user_id: decoded.userId },
      update,
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
        enabled: product.enabled,
      },
    });
  } catch (error) {
    console.error("Error toggling product:", error);
    return NextResponse.json(
      { error: "Failed to toggle product" },
      { status: 500 },
    );
  }
}
