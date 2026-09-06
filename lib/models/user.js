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
    // ✅ Facebook/Meta webhook VERIFY TOKEN.
    //    One unique token per user, reusable across ALL of that user's
    //    products. Facebook sends this back as hub.verify_token during
    //    webhook subscription verification.
    verifyToken: {
      type: String,
      unique: true,
      sparse: true, // ✅ Allow existing users without a token
    },
    // ✅ Whether the user has set a real (email) password.
    //    Google-only accounts are created without one and must set it
    //    in their profile before they can log out.
    hasPassword: {
      type: Boolean,
      default: false,
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
