// lib/services/unfound-keyword.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import UnfoundKeyword from "@/lib/models/unfound-keyword";

/**
 * ============================================
 * ✅ UNFOUND KEYWORD SERVICE (MongoDB)
 * ============================================
 *
 * Saves keywords that were NOT found in the keyword list / master sheet
 * directly to MongoDB, so admins can review, manage, and delete them.
 *
 *   - saveUnfoundKeywords() → save one or more unfound keywords
 *   - getUnfoundKeywords()  → list unfound keywords (with filters)
 *   - deleteUnfoundKeyword()→ delete a single unfound keyword
 *   - deleteManyUnfound()   → bulk delete
 *   - updateUnfoundKeyword()→ update status / notes
 */

/**
 * Save a list of unfound keywords to the database.
 * Non-fatal: if this fails, message processing still continues.
 * Uses an upsert so the same keyword for the same user increments its
 * count instead of creating duplicates.
 */
export async function saveUnfoundKeywords({
  user_id,
  product_id,
  sender_id,
  message,
  keywords = [],
}) {
  if (!keywords || keywords.length === 0) return { saved: 0 };
  try {
    await dbConnect();
    let saved = 0;
    for (const kw of keywords) {
      const text = String(kw || "").trim();
      if (!text) continue;
      // Upsert: increment count if the same (keyword, user) already exists
      await UnfoundKeyword.findOneAndUpdate(
        { keyword: text, user_id: user_id || null },
        {
          $setOnInsert: {
            keyword: text,
            user_id: user_id || null,
            product_id: product_id || null,
            sender_id: sender_id || "",
            message: message || "",
            status: "pending",
          },
          $inc: { count: 1 },
          $set: {
            // Keep the latest context
            product_id: product_id || null,
            sender_id: sender_id || "",
            message: message || "",
          },
        },
        { upsert: true, new: true },
      );
      saved++;
    }
    return { saved };
  } catch (error) {
    console.error("⚠️ Failed to save unfound keywords:", error.message);
    return { saved: 0, error: error.message };
  }
}

/**
 * Get unfound keywords, optionally filtered.
 * Returns { keywords, total }.
 */
export async function getUnfoundKeywords({
  page = 1,
  limit = 50,
  search = "",
  status = "",
} = {}) {
  await dbConnect();
  const query = {};
  if (search) query.keyword = { $regex: search, $options: "i" };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [keywords, total] = await Promise.all([
    UnfoundKeyword.find(query)
      .sort({ count: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UnfoundKeyword.countDocuments(query),
  ]);

  return {
    keywords,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Delete a single unfound keyword by id.
 */
export async function deleteUnfoundKeyword(id) {
  await dbConnect();
  return UnfoundKeyword.findByIdAndDelete(id);
}

/**
 * Bulk delete unfound keywords by ids.
 */
export async function deleteManyUnfoundKeywords(ids = []) {
  if (!ids.length) return { deleted: 0 };
  await dbConnect();
  const result = await UnfoundKeyword.deleteMany({ _id: { $in: ids } });
  return { deleted: result.deletedCount || 0 };
}

/**
 * Update an unfound keyword (status, notes).
 */
export async function updateUnfoundKeyword(id, data = {}) {
  await dbConnect();
  const allowed = ["status", "notes"];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  return UnfoundKeyword.findByIdAndUpdate(id, update, { new: true }).lean();
}
