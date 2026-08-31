import "server-only";
import mongoose from "mongoose";

const WebhookModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    webhook_url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    users_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // creates created_at & updated_at
  },
);

const WebhookModel =
  mongoose.models.WebhookModel ||
  mongoose.model("WebhookModel", WebhookModelSchema);
export default WebhookModel;
