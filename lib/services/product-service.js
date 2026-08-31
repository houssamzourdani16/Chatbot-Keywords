// lib/services/product-service.js
import { cache } from "react";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";

// ✅ Cached product queries
export const getProductByApiKey = cache(async (apiKey) => {
  await dbConnect();
  return Product.findOne({ api_key: apiKey });
});

export const getProductById = cache(async (id) => {
  await dbConnect();
  return Product.findById(id);
});
