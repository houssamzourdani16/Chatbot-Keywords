// lib/models/message.js
import "server-only";
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  // Which user owns this message
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

  // Who sent this message (external customer id, e.g. "customer_123")
  sender_id: {
    type: String,
    required: true,
    index: true,
  },

  // Which batch this message belongs to (set when batching starts)
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    default: null,
    index: true,
  },

  // ✅ The wait time (seconds) used for this message's batch. Stored on the
  //    message itself so ALL messages from the same sender show the SAME
  //    wait time, even if they end up in different batches.
  waiting_time: {
    type: Number,
    default: 7,
  },

  raw_data: {
    type: mongoose.Schema.Types.Mixed, // ← Can hold ANYTHING!
    required: true,
  },
  mode: {
    type: String,
    enum: ["test", "prod"],
    default: "prod",
  },

  // ✅ Incoming message text (extracted from raw_data for easy access)
  incoming_message: {
    type: String,
    default: "",
  },

  // ✅ Keywords detected in THIS message against the product's list
  //    e.g. ["salam", "pizza"]
  detected_keywords: {
    type: [String],
    default: [],
  },

  // ✅ Full row data for each detected keyword
  //    e.g. { "salam": { category: "greeting", row: 2, meaning: "..." }, ... }
  keyword_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Darija keywords detected
  status: {
    type: String,
    enum: ["received", "processing", "completed", "failed"],
    default: "received",
  },

  // ✅ The FULL outgoing payload that was sent to the n8n webhook
  //    (customer, product, conversation, keywords, lead, metadata,
  //    webhookUrl, executionMode). Stored after a successful send so the
  //    UI can show exactly what was delivered.
  sent_payload: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Test or Production mode
  created_at: {
    type: Date,
    default: Date.now,
    index: true, // ✅ Index for fast sorting
  },
});

// ✅ Optimize query performance with compound indexes
// These indexes allow fast filtering + sorting without scanning entire collection
MessageSchema.index({ user_id: 1, created_at: -1 }); // For user's messages sorted by date
MessageSchema.index({ user_id: 1, product_id: 1, created_at: -1 }); // User + product filter
MessageSchema.index({ user_id: 1, status: 1, created_at: -1 }); // User + status filter
MessageSchema.index({ user_id: 1, sender_id: 1, created_at: -1 }); // User + sender filter
MessageSchema.index({ user_id: 1, product_id: 1, status: 1 }); // For sender grouping queries

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
