import "server-only";
import mongoose from "mongoose";

const KeywordListSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      enum: ["darija", "arabic", "french", "english", "mixed"],
      default: "darija",
    },
    dialect: {
      type: String,
      enum: ["algerian", "moroccan", "tunisian", "libyan", "general"],
      default: "algerian",
    },
    is_active: {
      type: Boolean,
      default: true,
    },

    // ✅ GOOGLE SHEETS CONFIGURATION (ONLY SOURCE)
    google_sheets: {
      sheet_id: {
        type: String,
        required: true,
      },
      sheet_name: {
        type: String,
        default: "Sheet1",
      },
      range: {
        type: String,
        default: "A:B",
      },
      // ✅ PUBLIC SHEETS: Simple API Key (no OAuth, no Service Account)
      api_key: {
        type: String,
        default: "",
      },
      service_account_email: {
        type: String,
        default: "",
      },
      private_key: {
        type: String,
        default: "",
      },
      // Which Google account (OAuth connection) this sheet belongs to
      google_connection_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GoogleConnection",
        default: null,
      },
      // Column mapping
      columns: {
        keyword_column: {
          type: Number,
          default: 0, // Column A
        },
        category_column: {
          type: Number,
          default: 1, // Column B
        },
        metadata_columns: {
          type: [Number],
          default: [],
        },
      },
      // Connection status
      connection_status: {
        type: String,
        enum: ["pending", "connected", "failed"],
        default: "pending",
      },
      connection_error: {
        type: String,
        default: null,
      },
    },

    // ✅ CACHE SETTINGS
    cache: {
      enabled: {
        type: Boolean,
        default: true,
      },
      ttl: {
        type: Number,
        default: 300, // 5 minutes
      },
      last_sync_at: {
        type: Date,
        default: null,
      },
      last_sync_count: {
        type: Number,
        default: 0,
      },
    },

    // ✅ STATS (for dashboard display)
    stats: {
      total_keywords: {
        type: Number,
        default: 0,
      },
      total_categories: {
        type: Number,
        default: 0,
      },
      last_sync_count: {
        type: Number,
        default: 0,
      },
    },

    // Sync Status
    sync_status: {
      type: String,
      enum: ["idle", "syncing", "success", "failed"],
      default: "idle",
    },
    sync_error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // creates created_at & updated_at
  },
);

const KeywordList =
  mongoose.models.KeywordList ||
  mongoose.model("KeywordList", KeywordListSchema);
export default KeywordList;
