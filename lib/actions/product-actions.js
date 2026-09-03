// lib/actions/product-actions.js
"use server";

import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import { revalidatePath } from "next/cache";
import jwt from "jsonwebtoken";
import { resolveWaitingTime } from "@/lib/services/waiting-time.service";

// ============================================
// ✅ HELPER: Generate API Key
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
// ✅ HELPER: Get Unique API Key (with checking)
// ============================================
async function getUniqueApiKey() {
  let apiKey = generateApiKey();
  let existingProduct = await Product.findOne({ api_key: apiKey });
  let attempts = 0;
  const maxAttempts = 10;

  // Keep trying until we find a unique key
  while (existingProduct && attempts < maxAttempts) {
    console.log(`⚠️ API key collision: ${apiKey} - trying again...`);
    apiKey = generateApiKey();
    existingProduct = await Product.findOne({ api_key: apiKey });
    attempts++;
  }

  if (existingProduct) {
    throw new Error("Could not generate unique API key after 10 attempts");
  }

  console.log(`✅ Unique API key generated: ${apiKey}`);
  return apiKey;
}

// ============================================
// ✅ CREATE PRODUCT (Server Action)
// ============================================
export async function createProduct(formData) {
  "use server";

  try {
    await dbConnect();

    const userId = formData.get("userId");
    const name = formData.get("name");
    const price = parseFloat(formData.get("price"));
    const quantity = parseInt(formData.get("quantity"));
    const description = formData.get("description") || "";
    const webhook_url = formData.get("webhook_url") || "";
    const webhook_url_test = formData.get("webhook_url_test") || "";
    const webhook_model_id = formData.get("webhook_model_id") || null;
    const keyword_list_id = formData.get("keyword_list_id") || null;
    const category = formData.get("category") || "";
    const subcategory = formData.get("subcategory") || "";
    const name_ar = formData.get("name_ar") || "";
    const name_fr = formData.get("name_fr") || "";
    const compare_price = formData.get("compare_price")
      ? parseFloat(formData.get("compare_price"))
      : null;
    const stock_status = formData.get("stock_status") || "High";
    const status = formData.get("status") || "Active";
    const min_quantity = parseInt(formData.get("min_quantity")) || 1;
    const description_ar = formData.get("description_ar") || "";
    const material = formData.get("material") || "";
    const origin = formData.get("origin") || "";
    const weight = formData.get("weight") || "";
    const care = formData.get("care") || "";
    const warranty = formData.get("warranty") || "";
    const usp = formData.get("usp") || "";
    const target_audience = formData.get("target_audience") || "";
    const season = formData.get("season") || "All";
    const occasion = formData.get("occasion") || "";
    const sku_base = formData.get("sku_base") || "";
    const barcode = formData.get("barcode") || "";
    const supplier = formData.get("supplier") || "";
    const reorder_point = formData.get("reorder_point") || "";
    const location = formData.get("location") || "";

    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    if (!name || !price || !quantity) {
      return {
        success: false,
        error: "Name, price, and quantity are required",
      };
    }

    // ✅ Get a UNIQUE API key
    const apiKey = await getUniqueApiKey();

    // ✅ Resolve the waiting time using the Settings:
    //    - If the form omitted it, use the Settings default_waiting_time.
    //    - Clamp to the Settings max_waiting_time.
    const rawWaitingTime = parseInt(formData.get("waiting_time"), 10);
    const waiting_time = await resolveWaitingTime(rawWaitingTime);

    // Create product with the unique key
    const product = new Product({
      user_id: userId,
      name,
      price,
      quantity,
      description,
      api_key: apiKey, // ← Guaranteed unique!
      webhook_url: webhook_url || undefined,
      webhook_url_test: webhook_url_test || undefined,
      webhook_model_id: webhook_model_id || null,
      keyword_list_id: keyword_list_id || null,
      waiting_time,
      mode: "test", // ✅ Default to TEST mode
      category,
      subcategory,
      name_ar,
      name_fr,
      compare_price,
      stock_status,
      status,
      min_quantity,
      description_ar,
      material,
      origin,
      weight,
      care,
      warranty,
      usp,
      target_audience,
      season,
      occasion,
      sku_base,
      barcode,
      supplier,
      reorder_point,
      location,
    });

    await product.save();

    console.log(`✅ Product saved: ${product.name} (${product.api_key})`);

    revalidatePath("/dashboard");
    revalidatePath("/products");

    return {
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
    };
  } catch (error) {
    console.error("❌ Error creating product:", error);

    if (error.code === 11000) {
      return {
        success: false,
        error: "API key collision. Please try again.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to create product",
    };
  }
}

// ============================================
// ✅ UPDATE PRODUCT (Server Action)
// ============================================
export async function updateProduct(productId, formData) {
  "use server";

  try {
    await dbConnect();

    const name = formData.get("name");
    const price = parseFloat(formData.get("price"));
    const quantity = parseInt(formData.get("quantity"));
    const description = formData.get("description") || "";
    const waiting_time = parseInt(formData.get("waiting_time")) || 7;
    const status = formData.get("status") || "Active";
    const webhook_model_id = formData.get("webhook_model_id") || null;
    const keyword_list_id = formData.get("keyword_list_id") || null;

    // Catalog details
    const category = formData.get("category") || "";
    const subcategory = formData.get("subcategory") || "";
    const name_ar = formData.get("name_ar") || "";
    const name_fr = formData.get("name_fr") || "";
    const compare_price = formData.get("compare_price")
      ? parseFloat(formData.get("compare_price"))
      : null;
    const stock_status = formData.get("stock_status") || "High";
    const min_quantity = parseInt(formData.get("min_quantity")) || 1;
    const description_ar = formData.get("description_ar") || "";
    const material = formData.get("material") || "";
    const origin = formData.get("origin") || "";
    const weight = formData.get("weight") || "";
    const care = formData.get("care") || "";
    const warranty = formData.get("warranty") || "";
    const usp = formData.get("usp") || "";
    const target_audience = formData.get("target_audience") || "";
    const season = formData.get("season") || "All";
    const occasion = formData.get("occasion") || "";
    const sku_base = formData.get("sku_base") || "";
    const barcode = formData.get("barcode") || "";
    const supplier = formData.get("supplier") || "";
    const reorder_point = formData.get("reorder_point") || "";
    const location = formData.get("location") || "";

    const product = await Product.findById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (name) product.name = name;
    if (price) product.price = price;
    if (quantity) product.quantity = quantity;
    if (description) product.description = description;
    if (waiting_time) product.waiting_time = waiting_time;
    if (status) product.status = status;
    product.webhook_model_id = webhook_model_id || null;
    product.keyword_list_id = keyword_list_id || null;

    // Catalog details
    product.category = category;
    product.subcategory = subcategory;
    product.name_ar = name_ar;
    product.name_fr = name_fr;
    product.compare_price = compare_price;
    product.stock_status = stock_status;
    product.min_quantity = min_quantity;
    product.description_ar = description_ar;
    product.material = material;
    product.origin = origin;
    product.weight = weight;
    product.care = care;
    product.warranty = warranty;
    product.usp = usp;
    product.target_audience = target_audience;
    product.season = season;
    product.occasion = occasion;
    product.sku_base = sku_base;
    product.barcode = barcode;
    product.supplier = supplier;
    product.reorder_point = reorder_point;
    product.location = location;

    await product.save();

    revalidatePath(`/products/${productId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        description: product.description,
        waiting_time: product.waiting_time,
        status: product.status,
        webhook_model_id: product.webhook_model_id,
        keyword_list_id: product.keyword_list_id,
      },
    };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

// ============================================
// ✅ DELETE PRODUCT (Server Action)
// ============================================
export async function deleteProduct(productId) {
  "use server";

  try {
    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    await product.deleteOne();

    revalidatePath("/dashboard");
    revalidatePath("/products");

    return { success: true, message: "Product deleted successfully" };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

// ============================================
// ✅ GET PRODUCTS (Server Action)
// ============================================
export async function getProducts(token) {
  try {
    await dbConnect();

    if (!token) {
      return { success: false, error: "Unauthorized" };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const products = await Product.find({ user_id: decoded.userId }).sort({
      created_at: -1,
    });

    return { success: true, products: products, count: products.length };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}
