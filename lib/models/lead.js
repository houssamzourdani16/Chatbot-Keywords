import "server-only";
import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    // Which user owns this lead
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Which product this lead is interested in
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // The message that generated this lead
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // External customer id (e.g. "customer_123")
    customer_id: {
      type: String,
      required: true,
      index: true,
    },

    // Extracted lead details
    extracted_data: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      interest: { type: String, default: "" },
      quantity: { type: Number, default: 0 },
      budget: { type: Number, default: 0 },
    },

    // Confidence score (0-100) based on info completeness
    confidence_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Lead status
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "lost"],
      default: "new",
    },

    // Raw conversation that generated this lead
    raw_conversation: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true, // creates created_at & updated_at
  },
);

// Prevent duplicate leads for the same customer + product
LeadSchema.index({ customer_id: 1, product_id: 1 }, { unique: true });

const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
export default Lead;
