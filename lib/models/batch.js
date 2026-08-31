// lib/models/batch.js
import "server-only";
import mongoose from "mongoose";

const BatchSchema = new mongoose.Schema({
  // Which user owns this batch
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // Which product this batch belongs to
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },

  // The external sender this batch groups messages for
  sender_id: {
    type: String,
    required: true,
    index: true,
  },

  // When the debounce timer should fire (reset on each new message)
  expires_at: {
    type: Date,
    required: true,
    index: true,
  },

  // How long the debounce window is (seconds) — copied from product.waiting_time
  waiting_time: {
    type: Number,
    default: 5,
  },

  // Batch lifecycle
  status: {
    type: String,
    enum: ["open", "processing", "completed", "failed"],
    default: "open",
    index: true,
  },

  // When the batch was actually sent/processed
  processed_at: {
    type: Date,
    default: null,
  },

  created_at: {
    type: Date,
    default: Date.now,
  },
});

// A product can only have ONE OPEN batch per sender at a time.
// Partial index: uniqueness is only enforced on `status: "open"`,
// so multiple completed/failed batches for the same sender are allowed.
BatchSchema.index(
  { product_id: 1, sender_id: 1 },
  { unique: true, partialFilterExpression: { status: "open" } },
);

export default mongoose.models.Batch || mongoose.model("Batch", BatchSchema);
