import "server-only";
import mongoose from "mongoose";

/**
 * Stores the Google Sheets configuration used to archive ALL conversations
 * by Sender ID.
 *
 * Sheet layout (like the keywords sheet, but for conversations):
 *   - Column A (sender_id_column): the Sender ID
 *   - Columns B..Z (conversation_columns): each cell holds one message from
 *     that sender's conversation history.
 *
 * Before the n8n webhook call, the batch processor reads this sheet, finds
 * the row matching the current sender_id, and includes ALL past messages in
 * the outgoing payload so the AI in n8n has full context.
 */
const ConversationsSheetConfigSchema = new mongoose.Schema(
  {
    // A friendly name to identify this sheet (e.g. "Main", "Support")
    name: {
      type: String,
      default: "Conversations",
    },
    // Service account credentials (same style as the keywords sheet)
    service_account_email: {
      type: String,
      default: "",
    },
    private_key: {
      type: String,
      default: "",
    },
    // ✅ PUBLIC SHEETS: Simple API Key (no OAuth, no Service Account)
    api_key: {
      type: String,
      default: "",
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
      sender_id_column: {
        type: Number,
        default: 0, // Column A
      },
      // Optional: how many conversation columns to read (0 = all)
      max_conversation_columns: {
        type: Number,
        default: 0,
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
    total_senders: {
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

export default mongoose.models.ConversationsSheetConfig ||
  mongoose.model("ConversationsSheetConfig", ConversationsSheetConfigSchema);
