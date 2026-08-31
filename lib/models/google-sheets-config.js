import "server-only";
import mongoose from "mongoose";

/**
 * Stores Google Sheets manual configuration (service account credentials).
 * This is the MANUAL alternative to OAuth — users enter credentials directly.
 */
const GoogleSheetsConfigSchema = new mongoose.Schema(
  {
    // Service account credentials
    service_account_email: {
      type: String,
      required: true,
    },
    private_key: {
      type: String,
      required: true,
    },
    // Spreadsheet details
    spreadsheet_id: {
      type: String,
      required: true,
    },
    sheet_name: {
      type: String,
      default: "Sheet1",
    },
    range: {
      type: String,
      default: "A:Z",
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
    // Sync info
    last_sync_at: {
      type: Date,
      default: null,
    },
    last_sync_count: {
      type: Number,
      default: 0,
    },
    total_keywords: {
      type: Number,
      default: 0,
    },
    total_categories: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.GoogleSheetsConfig ||
  mongoose.model("GoogleSheetsConfig", GoogleSheetsConfigSchema);