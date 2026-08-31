// lib/actions/admin-actions.js
"use server";

import dbConnect from "@/lib/database/database";
import User from "@/lib/models/user";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch";
import Field from "@/lib/models/field";
import { revalidatePath } from "next/cache";
import jwt from "jsonwebtoken";

// ============================================
// ✅ HELPER: Verify super admin from token
// ============================================
async function verifySuperAdminToken(token) {
  if (!token) return null;
  try {
    await dbConnect();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select(
      "-password -refreshToken",
    );
    if (!user || user.role !== "super_admin") return null;
    return user;
  } catch (error) {
    return null;
  }
}

// ============================================
// ✅ GET ADMIN STATS
// ============================================
export async function getAdminStats(token) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const [userCount, productCount, messageCount, batchCount] = await Promise.all(
    [
      User.countDocuments(),
      Product.countDocuments(),
      Message.countDocuments(),
      Batch.countDocuments(),
    ],
  );

  const products = await Product.find({}).select("price quantity");
  const revenue = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.quantity || 0),
    0,
  );

  return {
    success: true,
    stats: {
      users: userCount,
      products: productCount,
      messages: messageCount,
      batches: batchCount,
      revenue,
    },
  };
}

// ============================================
// ✅ GET PRODUCTS (with pagination)
// ============================================
export async function getProducts(
  token,
  { page = 1, limit = 10, search = "", status = "" } = {},
) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const query = {};
  if (search) query.name = { $regex: search, $options: "i" };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query),
  ]);

  const enriched = await Promise.all(
    products.map(async (p) => {
      const messageCount = await Message.countDocuments({ product_id: p._id });
      return {
        id: p._id,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        description: p.description,
        api_key: p.api_key,
        waiting_time: p.waiting_time,
        status: p.status || "Active",
        created_at: p.created_at,
        messageCount,
      };
    }),
  );

  return {
    success: true,
    products: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// ✅ GET SINGLE PRODUCT
// ============================================
export async function getProduct(token, id) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const product = await Product.findById(id).lean();
  if (!product) return { success: false, error: "Product not found" };

  const [messageCount, testCount, prodCount] = await Promise.all([
    Message.countDocuments({ product_id: id }),
    Message.countDocuments({ product_id: id, mode: "test" }),
    Message.countDocuments({ product_id: id, mode: "prod" }),
  ]);

  return {
    success: true,
    product: { ...product, messageCount, testCount, prodCount },
  };
}

// ============================================
// ✅ GET PRODUCT MESSAGES
// ============================================
export async function getProductMessages(
  token,
  id,
  { page = 1, limit = 50 } = {},
) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

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

  return {
    success: true,
    messages: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// ✅ UPDATE PRODUCT
// ============================================
export async function updateProduct(token, id, data) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const product = await Product.findById(id);
  if (!product) return { success: false, error: "Product not found" };

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
    if (data[key] !== undefined) product[key] = data[key];
  }

  await product.save();
  revalidatePath("/admin");

  return { success: true, product };
}

// ============================================
// ✅ DELETE PRODUCT
// ============================================
export async function deleteProduct(token, id) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const product = await Product.findById(id);
  if (!product) return { success: false, error: "Product not found" };

  await Promise.all([
    Message.deleteMany({ product_id: id }),
    Batch.deleteMany({ product_id: id }),
    Product.findByIdAndDelete(id),
  ]);

  revalidatePath("/admin");

  return { success: true, message: `Deleted product "${product.name}"` };
}

// ============================================
// ✅ GET FIELDS
// ============================================
export async function getFields(token) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();
  const fields = await Field.find({}).sort({ sort_order: 1 }).lean();

  return { success: true, fields };
}

// ============================================
// ✅ CREATE FIELD
// ============================================
export async function createField(token, data) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  if (!data.field_name || !data.field_label) {
    return { success: false, error: "field_name and field_label are required" };
  }

  await dbConnect();

  const lastField = await Field.findOne().sort({ sort_order: -1 });
  const sortOrder = lastField ? lastField.sort_order + 1 : 0;

  try {
    const field = await Field.create({
      field_name: data.field_name,
      field_label: data.field_label,
      field_type: data.field_type || "text",
      is_required: data.is_required || false,
      is_visible: data.is_visible !== false,
      sort_order: sortOrder,
      options: data.options || [],
      default_value: data.default_value || "",
    });
    revalidatePath("/admin/fields");
    return { success: true, field };
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, error: "Field name already exists" };
    }
    return { success: false, error: "Failed to create field" };
  }
}

// ============================================
// ✅ UPDATE FIELD
// ============================================
export async function updateField(token, id, data) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const field = await Field.findById(id);
  if (!field) return { success: false, error: "Field not found" };

  const allowed = [
    "field_name",
    "field_label",
    "field_type",
    "is_required",
    "is_visible",
    "sort_order",
    "options",
    "default_value",
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) field[key] = data[key];
  }

  await field.save();
  revalidatePath("/admin/fields");

  return { success: true, field };
}

// ============================================
// ✅ DELETE FIELD
// ============================================
export async function deleteField(token, id) {
  const admin = await verifySuperAdminToken(token);
  if (!admin) return { success: false, error: "Unauthorized" };

  await dbConnect();

  const field = await Field.findByIdAndDelete(id);
  if (!field) return { success: false, error: "Field not found" };

  revalidatePath("/admin/fields");

  return { success: true, message: `Deleted field "${field.field_label}"` };
}
