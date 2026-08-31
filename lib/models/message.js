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

  raw_data: {
    type: mongoose.Schema.Types.Mixed, // ← Can hold ANYTHING!
    required: true,
  },
  mode: {
    type: String,
    enum: ["test", "prod"],
    default: "prod",
  },

  // Darija keywords detected
  status: {
    type: String,
    enum: ["received", "processing", "completed", "failed"],
    default: "received",
  },

  // Test or Production mode
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
