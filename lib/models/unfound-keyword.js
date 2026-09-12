// lib/models/unfound-keyword.js
import "server-only";
import mongoose from "mongoose";

/**
 * Stores keywords that were NOT found in the keyword list / master sheet.
 *
 * When a message contains a word that isn't recognized as a known keyword,
 * it's saved here so admins can review, manage, and delete them — instead
 * of only relying on the Google Sheets "new keywords" sheet.
 *
 * Each document holds ONE unfound keyword, with metadata about where it
 * came from (sender, product, message) and how many times it appeared.
 */
const UnfoundKeywordSchema = new mongoose.Schema(
  {
    // The keyword text that wasn't found
    keyword: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Which user owns this record
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Which product the message belonged to
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },

    // Which sender sent the message containing this keyword
    sender_id: {
      type: String,
      default: "",
      index: true,
    },

    // The full message text where this keyword appeared
    message: {
      type: String,
      default: "",
    },

    // How many times this keyword has been seen as unfound
    count: {
      type: Number,
      default: 1,
    },

    // Status for admin management
    status: {
      type: String,
      enum: ["pending", "reviewed", "added", "ignored"],
      default: "pending",
    },

    // Optional admin notes
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // creates created_at & updated_at
  },
);

// ✅ Unique per (keyword, user) so we can increment count instead of
//    creating duplicate documents for the same unfound keyword.
UnfoundKeywordSchema.index({ keyword: 1, user_id: 1 }, { unique: true });

export default mongoose.models.UnfoundKeyword ||
  mongoose.model("UnfoundKeyword", UnfoundKeywordSchema);
