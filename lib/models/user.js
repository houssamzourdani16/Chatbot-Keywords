import "server-only";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },
    plan: {
      type: String,
      enum: ["Basic", "Pro", "Enterprise"],
      default: "Basic",
    },
    webhook_model_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebhookModel",
      default: null,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
