// lib/models/conversation.js
import "server-only";
import mongoose from "mongoose";

/**
 * Stores the full conversation history per Sender ID in MongoDB.
 *
 * Each document holds ONE message from a sender. To get the full
 * conversation for a sender, query by sender_id and sort by created_at.
 *
 * This replaces the old Google Sheets conversation archive — no external
 * sheet or credentials needed.
 */
const ConversationSchema = new mongoose.Schema(
  {
    // Which user owns this conversation
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Which product this message belongs to
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Who sent this message (external customer id)
    sender_id: {
      type: String,
      required: true,
      index: true,
    },

    // The FULL message text as it arrived
    message: {
      type: String,
      required: true,
    },

    // The raw payload (can hold anything)
    raw_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Test or Production mode
    mode: {
      type: String,
      enum: ["test", "prod"],
      default: "prod",
    },
  },
  {
    timestamps: true, // creates created_at & updated_at
  },
);

// ✅ Optimize queries: fetch a sender's conversation sorted by time
ConversationSchema.index({ sender_id: 1, created_at: 1 });
ConversationSchema.index({ user_id: 1, sender_id: 1, created_at: 1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
