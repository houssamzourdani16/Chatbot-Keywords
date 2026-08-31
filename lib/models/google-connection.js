import "server-only";
import mongoose from "mongoose";

/**
 * Stores Google OAuth 2.0 tokens for an admin user.
 *
 * ✅ MULTI-ACCOUNT SUPPORT
 * An admin can connect MULTIPLE Google accounts. Each account is a
 * separate document. This lets you add keywords from different Google
 * accounts/sheets when you hit limits on one account.
 *
 * Each connection is uniquely identified by (user_id + email).
 */
const GoogleConnectionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Unique per user+email (allows multiple accounts per user)
    email: {
      type: String,
      default: "",
    },
    access_token: {
      type: String,
      required: true,
    },
    refresh_token: {
      type: String,
      default: null,
    },
    scope: {
      type: String,
      default: "",
    },
    token_type: {
      type: String,
      default: "Bearer",
    },
    expiry_date: {
      type: Number,
      default: null,
    },
    // Google account info
    name: {
      type: String,
      default: "",
    },
    picture: {
      type: String,
      default: "",
    },
    is_connected: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Allow multiple connections per user, but only one per email
GoogleConnectionSchema.index({ user_id: 1, email: 1 }, { unique: true });

export default mongoose.models.GoogleConnection ||
  mongoose.model("GoogleConnection", GoogleConnectionSchema);
