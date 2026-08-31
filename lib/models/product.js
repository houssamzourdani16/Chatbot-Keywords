// lib/models/product.js
import "server-only";
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  api_key: {
    type: String,
    unique: true,
    sparse: true, // ✅ Allows multiple documents to omit/null this field
  },
  webhook_url: {
    type: String,
    unique: true,
    sparse: true, // ✅ Allows multiple documents to omit/null this field
  },
  webhook_url_test: {
    type: String,
    unique: true,
    sparse: true, // ✅ Allows multiple documents to omit/null this field
  },
  // Which AI model/webhook the user selected for this product
  webhook_model_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WebhookModel",
    default: null,
  },
  // Which keyword list (Google Sheet) the user selected for this product
  keyword_list_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "KeywordList",
    default: null,
  },
  waiting_time: {
    type: Number,
    default: 5,
    min: 1,
    max: 30,
  },
  mode: {
    type: String,
    enum: ["test", "prod"],
    default: "test", // ✅ Default to TEST mode (limited to 5/day)
  },
  // ============================================
  // ✅ PRODUCT CATALOG DETAILS (for AI agent)
  // ============================================
  category: { type: String, default: "" }, // Clothing/Accessories/Footwear/Other
  subcategory: { type: String, default: "" }, // Hijabs/Dresses/Shirts/etc.
  name_ar: { type: String, default: "" }, // Arabic name
  name_fr: { type: String, default: "" }, // French name
  compare_price: { type: Number, default: null }, // Optional compare price
  stock_status: { type: String, default: "High" }, // High/Medium/Low/Out/Preorder
  status: { type: String, default: "Active" }, // Active/Inactive/Coming Soon
  min_quantity: { type: Number, default: 1 },
  description_ar: { type: String, default: "" }, // Long Arabic description
  images: { type: mongoose.Schema.Types.Mixed, default: {} }, // { main, angle1, angle2, model, packaging, closeup }
  colors: { type: mongoose.Schema.Types.Mixed, default: [] }, // [{ name, sku, stock, popularity, image_url }]
  sizes: { type: mongoose.Schema.Types.Mixed, default: [] }, // [{ size, sku, stock, fit, measurements }]
  material: { type: String, default: "" },
  origin: { type: String, default: "" },
  weight: { type: String, default: "" },
  care: { type: String, default: "" },
  warranty: { type: String, default: "" },
  features: { type: mongoose.Schema.Types.Mixed, default: [] }, // [feature1, feature2, ...]
  usp: { type: String, default: "" }, // Unique Selling Proposition
  target_audience: { type: String, default: "" },
  season: { type: String, default: "All" }, // All/Summer/Winter/Ramadan/Eid
  occasion: { type: String, default: "" },
  tags: { type: mongoose.Schema.Types.Mixed, default: [] }, // [tag1, tag2, ...]
  conversion_rate: { type: String, default: "" },
  avg_quantity_per_order: { type: String, default: "" },
  common_combos: { type: String, default: "" },
  related_products: { type: mongoose.Schema.Types.Mixed, default: [] },
  sku_base: { type: String, default: "" },
  barcode: { type: String, default: "" },
  supplier: { type: String, default: "" },
  reorder_point: { type: String, default: "" },
  location: { type: String, default: "" },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
