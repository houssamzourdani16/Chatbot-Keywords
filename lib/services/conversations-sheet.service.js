// lib/services/conversations-sheet.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import ConversationsSheetConfig from "@/lib/models/conversations-sheet-config";
import {
  buildServiceAccountAuth,
  validateCredentials,
  getSheetsClient,
} from "@/lib/utils/google-auth";
import { PublicSheetService } from "@/lib/services/public-sheet.service";
import { google } from "googleapis";

/**
 * ============================================
 * ✅ CONVERSATIONS SHEET SERVICE
 * ============================================
 *
 * Archives ALL conversations by Sender ID in one or more Google Sheets.
 *
 * Sheet layout (like the keywords sheet, but for conversations):
 *   - Column A (sender_id_column): the Sender ID
 *   - Columns B..Z: each cell holds one message from that sender's history
 *
 * You can add MULTIPLE conversation sheets. Before the n8n webhook call,
 * the batch processor calls `getConversationBySender(senderId)` which reads
 * EVERY configured sheet, finds the row matching the sender id, and merges
 * all past messages into the outgoing payload so the AI in n8n has full
 * context.
 */

// In-memory cache: { syncedAt }
let memoryCache = null;

/**
 * Get ALL saved conversations sheet configs.
 */
export async function getConfigs() {
  await dbConnect();
  return ConversationsSheetConfig.find({}).sort({ createdAt: 1 }).lean();
}

/**
 * Get a single config by id.
 */
export async function getConfigById(id) {
  await dbConnect();
  return ConversationsSheetConfig.findById(id).lean();
}

/**
 * Get the full content (rows) of a conversations sheet config for display.
 * Returns { success, rows, total, name, sheet_name, error? }
 */
export async function getSheetContent(configId) {
  await dbConnect();
  const config = await ConversationsSheetConfig.findById(configId).lean();
  if (!config) {
    throw new Error("Conversations sheet config not found");
  }

  const { rows } = await readAllRows(config);

  return {
    success: true,
    rows,
    total: rows.length,
    name: config.name || "Conversations",
    sheet_name: config.sheet_name,
    spreadsheet_id: config.spreadsheet_id,
  };
}

/**
 * Save (create or update) a conversations sheet config.
 * If `id` is provided, updates that config; otherwise creates a new one.
 */
export async function saveConfig(data, id) {
  await dbConnect();

  const payload = {
    name: data.name || "Conversations",
    service_account_email: data.service_account_email || "",
    private_key: data.private_key || "",
    api_key: data.api_key || "",
    spreadsheet_id: data.spreadsheet_id,
    sheet_name: data.sheet_name || "Sheet1",
    range: data.range || "A:Z",
    columns: {
      sender_id_column: data.columns?.sender_id_column || 0,
      max_conversation_columns: data.columns?.max_conversation_columns || 0,
    },
    is_active: data.is_active !== undefined ? data.is_active : true,
  };

  if (id) {
    const config = await ConversationsSheetConfig.findById(id);
    if (!config) {
      throw new Error("Conversations sheet config not found");
    }
    Object.assign(config, payload);
    await config.save();
    return config;
  }

  return ConversationsSheetConfig.create(payload);
}

/**
 * Delete a conversations sheet config by id.
 */
export async function deleteConfig(id) {
  await dbConnect();
  return ConversationsSheetConfig.findByIdAndDelete(id);
}

/**
 * Test the connection to a conversations sheet step-by-step.
 * Returns { success, steps, sheetNames?, preview?, error? }
 *
 * Supports BOTH:
 *   - PUBLIC sheets (link-only): just a spreadsheet_id, no credentials.
 *     Uses PublicSheetService (OpenSheet / CSV export) — no API key needed.
 *   - Service account sheets: service_account_email + private_key.
 */
export async function testConnection(data) {
  const steps = [];

  // STEP 1: Validate required fields
  const missing = [];
  if (!data.spreadsheet_id) missing.push("Spreadsheet ID");

  if (missing.length > 0) {
    steps.push({
      step: 1,
      name: "Required Fields",
      status: "failed",
      message: `Missing: ${missing.join(", ")}`,
    });
    return { success: false, steps, currentStep: 1 };
  }
  steps.push({
    step: 1,
    name: "Required Fields",
    status: "success",
    message: "✅ All required fields provided",
  });

  // ✅ PUBLIC SHEET (link-only): no service account / private key needed.
  //    Uses OpenSheet / CSV export — the sheet must be shared with
  //    "Anyone with the link can view".
  const isPublic = !data.service_account_email && !data.private_key;

  if (isPublic) {
    return testPublicConnection(data, steps);
  }

  // ============================================
  // SERVICE ACCOUNT path (existing behavior)
  // ============================================

  // STEP 2: Validate credentials format
  const credCheck = validateCredentials(
    data.service_account_email,
    data.private_key,
  );
  if (!credCheck.valid) {
    steps.push({
      step: 2,
      name: "Credentials Format",
      status: "failed",
      message: `❌ ${credCheck.error}`,
    });
    return { success: false, steps, currentStep: 2 };
  }
  steps.push({
    step: 2,
    name: "Credentials Format",
    status: "success",
    message: "✅ Credentials look valid",
  });

  // STEP 3: Authenticate with Google
  let sheets;
  try {
    const auth = buildServiceAccountAuth(
      data.service_account_email,
      data.private_key,
    );
    await auth.getClient();
    sheets = google.sheets({ version: "v4", auth });
    steps.push({
      step: 3,
      name: "Google Authentication",
      status: "success",
      message: "✅ Authenticated with Google",
    });
  } catch (error) {
    steps.push({
      step: 3,
      name: "Google Authentication",
      status: "failed",
      message: `❌ Authentication failed: ${error.message}`,
    });
    return { success: false, steps, currentStep: 3 };
  }

  // STEP 4: Access the spreadsheet
  let meta;
  try {
    meta = await sheets.spreadsheets.get({
      spreadsheetId: data.spreadsheet_id,
    });
    steps.push({
      step: 4,
      name: "Spreadsheet Access",
      status: "success",
      message: "✅ Spreadsheet found and accessible",
    });
  } catch (error) {
    steps.push({
      step: 4,
      name: "Spreadsheet Access",
      status: "failed",
      message: `❌ Cannot access spreadsheet: ${error.message}`,
    });
    return { success: false, steps, currentStep: 4 };
  }

  // STEP 5: List all sheets
  const sheetNames = meta.data.sheets?.map((s) => s.properties?.title) || [];
  if (sheetNames.length === 0) {
    steps.push({
      step: 5,
      name: "List Sheets",
      status: "failed",
      message: "❌ No sheets found in this spreadsheet",
    });
    return { success: false, steps, currentStep: 5 };
  }
  steps.push({
    step: 5,
    name: "List Sheets",
    status: "success",
    message: `✅ Found ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`,
    sheetNames,
  });

  // STEP 6: Verify the selected sheet exists
  const sheetName = data.sheet_name || sheetNames[0];
  if (!sheetNames.includes(sheetName)) {
    steps.push({
      step: 6,
      name: "Selected Sheet",
      status: "failed",
      message: `❌ Sheet "${sheetName}" not found. Available: ${sheetNames.join(", ")}`,
      sheetNames,
    });
    return { success: false, steps, currentStep: 6, sheetNames };
  }
  steps.push({
    step: 6,
    name: "Selected Sheet",
    status: "success",
    message: `✅ Sheet "${sheetName}" exists`,
    sheetNames,
  });

  // STEP 7: Read a preview of the data
  let preview = [];
  let previewError = null;
  try {
    const previewRes = await sheets.spreadsheets.values.get({
      spreadsheetId: data.spreadsheet_id,
      range: `${sheetName}!A1:F5`,
    });
    preview = previewRes.data.values || [];
  } catch (error) {
    previewError = error.message;
  }

  if (previewError) {
    steps.push({
      step: 7,
      name: "Read Data",
      status: "failed",
      message: `❌ Could not read data: ${previewError}`,
    });
    return { success: false, steps, currentStep: 7, sheetNames };
  }

  steps.push({
    step: 7,
    name: "Read Data",
    status: "success",
    message: `✅ Read ${preview.length} row(s) of preview data`,
    preview,
  });

  return {
    success: true,
    steps,
    currentStep: 7,
    sheetNames,
    preview,
    selectedSheet: sheetName,
  };
}

/**
 * Test a PUBLIC conversations sheet (link-only, no credentials).
 * Uses PublicSheetService (OpenSheet / CSV export).
 */
async function testPublicConnection(data, steps) {
  const sheetName = data.sheet_name || "Sheet1";

  // STEP 2: Try to read the public sheet
  try {
    const service = new PublicSheetService(data.spreadsheet_id, sheetName);
    const { rows, headers } = await service.getRows();

    steps.push({
      step: 2,
      name: "Public Sheet Access",
      status: "success",
      message: `✅ Public sheet accessible (${rows.length} row(s))`,
    });

    // STEP 3: Preview
    const preview = rows
      .slice(0, 5)
      .map((row) => row.map((cell) => String(cell ?? "")));
    if (headers && headers.length > 0 && preview.length > 0) {
      // Prepend headers as the first row for display
      preview.unshift(headers.map((h) => String(h ?? "")));
    }

    steps.push({
      step: 3,
      name: "Read Data",
      status: "success",
      message: `✅ Read ${rows.length} row(s) of data`,
      preview,
    });

    return {
      success: true,
      steps,
      currentStep: 3,
      sheetNames: [sheetName],
      preview,
      selectedSheet: sheetName,
      isPublic: true,
    };
  } catch (error) {
    steps.push({
      step: 2,
      name: "Public Sheet Access",
      status: "failed",
      message: `❌ Could not access public sheet: ${error.message}`,
    });
    return { success: false, steps, currentStep: 2, isPublic: true };
  }
}

/**
 * Read ALL rows from a single conversations sheet config.
 * Returns { rows, total }
 * Each row is a raw array of cell values.
 *
 * Supports BOTH:
 *   - PUBLIC sheets (link-only): uses PublicSheetService (OpenSheet / CSV).
 *   - Service account sheets: uses the Google Sheets API.
 */
export async function readAllRows(config) {
  if (!config) {
    throw new Error("Conversations sheet not configured");
  }

  const { spreadsheet_id, sheet_name, range } = config;

  // ✅ PUBLIC SHEET (link-only): no service account / private key.
  if (!config.service_account_email && !config.private_key) {
    const service = new PublicSheetService(spreadsheet_id, sheet_name);
    const { rows } = await service.getRows();
    return { rows, total: rows.length };
  }

  // Service account path
  const sheets = getSheetsClient(
    config.service_account_email,
    config.private_key,
  );

  const fullRange = `${sheet_name}!${range}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet_id,
    range: fullRange,
  });

  const rows = response.data.values || [];
  return { rows, total: rows.length };
}

/**
 * Get the full conversation history for a specific sender id.
 *
 * Checks EVERY configured sheet IN ORDER (sorted by createdAt) and returns
 * the conversation from the FIRST sheet that contains this sender id.
 *
 *   - Sheet 1: if it has the sender id → use it, STOP.
 *   - Sheet 2: only checked if Sheet 1 did NOT have the sender id.
 *   - Sheet 3: only checked if Sheets 1 & 2 did NOT have the sender id.
 *   ... and so on.
 *
 * This means each sender's history lives in exactly ONE sheet (the first
 * one that contains them), and we never merge duplicates across sheets.
 *
 * Returns { messages, found, sender_id, sources }
 */
export async function getConversationBySender(senderId) {
  if (!senderId) {
    return { messages: [], found: false, sender_id: senderId, sources: [] };
  }

  const configs = await getConfigs();
  const activeConfigs = configs.filter((c) => c.is_active !== false);

  if (activeConfigs.length === 0) {
    return { messages: [], found: false, sender_id: senderId, sources: [] };
  }

  // ✅ Check each sheet IN ORDER (oldest first). Stop at the FIRST sheet
  //    that contains this sender id — do NOT continue to later sheets.
  for (const config of activeConfigs) {
    try {
      const { rows } = await readAllRows(config);
      const senderCol = config.columns?.sender_id_column || 0;
      const maxCols = config.columns?.max_conversation_columns || 0;

      // Find the row matching this sender id (string compare, trimmed)
      let matchRow = null;
      for (const row of rows) {
        const cell = String(row[senderCol] || "").trim();
        if (cell && cell === String(senderId).trim()) {
          matchRow = row;
          break;
        }
      }

      // Sender not in this sheet → try the NEXT sheet.
      if (!matchRow) continue;

      // ✅ Found the sender in THIS sheet → collect its conversation and
      //    STOP. We do NOT look in any later sheets.
      const messages = [];
      const start = senderCol + 1;
      const end = maxCols > 0 ? start + maxCols : matchRow.length;
      for (let i = start; i < end; i++) {
        const cell = String(matchRow[i] || "").trim();
        if (cell) messages.push(cell);
      }

      if (messages.length > 0) {
        return {
          messages,
          found: true,
          sender_id: senderId,
          sources: [
            {
              config_id: config._id,
              name: config.name || "Conversations",
              sheet_name: config.sheet_name,
              messages: messages.length,
            },
          ],
        };
      }
    } catch (error) {
      console.error(
        `⚠️ Failed to read conversation from sheet "${config.name}":`,
        error.message,
      );
      // Continue to the next sheet on error (non-fatal)
    }
  }

  // Sender not found in ANY sheet
  return { messages: [], found: false, sender_id: senderId, sources: [] };
}

/**
 * Append a message to the conversations sheet for a sender.
 *
 * Finds the sender's row (by sender ID in Column A) and writes the NEW
 * message at the TOP (the first message column, right after the sender ID),
 * shifting any existing messages to the right. If the sender does NOT
 * exist yet, creates a NEW row with the sender ID in Column A and the
 * message in Column B.
 *
 * This is a WRITE operation — it requires a service account with write
 * access to the sheet (public "view" sheets cannot be written to).
 *
 * Returns { success, action: "appended" | "created" | "skipped", row?, error? }
 */
export async function appendMessageToSheet(senderId, message) {
  if (!senderId || !message) {
    return {
      success: false,
      action: "skipped",
      error: "Missing sender or message",
    };
  }

  const configs = await getConfigs();
  const activeConfigs = configs.filter((c) => c.is_active !== false);

  if (activeConfigs.length === 0) {
    return { success: false, action: "skipped", error: "No sheets configured" };
  }

  // ✅ Find the FIRST sheet that already has this sender (in order).
  //    If found, append there. If not found in any sheet, create a new
  //    row in the FIRST active sheet.
  let targetConfig = null;
  let matchRowIndex = -1;
  let matchRow = null;

  for (const config of activeConfigs) {
    try {
      const { rows } = await readAllRows(config);
      const senderCol = config.columns?.sender_id_column || 0;

      for (let i = 0; i < rows.length; i++) {
        const cell = String(rows[i][senderCol] || "").trim();
        if (cell && cell === String(senderId).trim()) {
          targetConfig = config;
          matchRowIndex = i;
          matchRow = rows[i];
          break;
        }
      }
      if (targetConfig) break; // found the sender — stop searching
    } catch (error) {
      console.error(
        `⚠️ Failed to read sheet "${config.name}" for append:`,
        error.message,
      );
    }
  }

  // If the sender wasn't found in any sheet, use the FIRST active sheet
  // to create a new row.
  if (!targetConfig) {
    targetConfig = activeConfigs[0];
  }

  try {
    const sheets = getSheetsClient(
      targetConfig.service_account_email,
      targetConfig.private_key,
    );

    const { spreadsheet_id, sheet_name } = targetConfig;
    const senderCol = targetConfig.columns?.sender_id_column || 0;

    if (matchRowIndex >= 0) {
      // ✅ Sender EXISTS → write the NEW message at the TOP (the first
      //    message column, right after the sender ID) and shift the
      //    existing messages to the right.
      const firstMsgCol = senderCol + 1; // Column B by default
      const rowNumber = matchRowIndex + 1;

      // Build the new row: sender ID, then the new message, then all
      // existing messages (shifted right).
      const existingMessages = [];
      for (let i = firstMsgCol; i < matchRow.length; i++) {
        const cell = String(matchRow[i] || "").trim();
        if (cell) existingMessages.push(cell);
      }

      const newRowValues = [String(senderId)];
      newRowValues.push(String(message));
      newRowValues.push(...existingMessages);

      // Write the whole row starting at Column A.
      const startColLetter = columnToLetter(senderCol);
      const cellRange = `${sheet_name}!${startColLetter}${rowNumber}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheet_id,
        range: cellRange,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRowValues] },
      });

      return {
        success: true,
        action: "appended",
        config_id: targetConfig._id,
        sheet_name,
        row: rowNumber,
        column: columnToLetter(firstMsgCol),
      };
    } else {
      // ✅ Sender does NOT exist → create a NEW row.
      //    Sender ID in Column A, message in Column B.
      const senderColLetter = columnToLetter(senderCol);
      const msgColLetter = columnToLetter(senderCol + 1);

      // Find the actual next empty row
      const { rows } = await readAllRows(targetConfig);
      const nextRow = rows.length + 1;

      const values = [];
      values[senderCol] = String(senderId);
      values[senderCol + 1] = String(message);

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheet_id,
        range: `${sheet_name}!A${nextRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });

      return {
        success: true,
        action: "created",
        config_id: targetConfig._id,
        sheet_name,
        row: nextRow,
        column: `${senderColLetter},${msgColLetter}`,
      };
    }
  } catch (error) {
    console.error(
      `⚠️ Failed to append message to sheet "${targetConfig.name}":`,
      error.message,
    );
    return { success: false, action: "skipped", error: error.message };
  }
}

/**
 * Convert a zero-based column index to a Google Sheets column letter.
 * 0 → A, 1 → B, 25 → Z, 26 → AA, etc.
 */
function columnToLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

/**
 * Sync all conversations sheets and update stats.
 */
export async function syncConversations() {
  const configs = await getConfigs();
  if (configs.length === 0) {
    throw new Error("No conversations sheets configured");
  }

  let totalRows = 0;
  let synced = 0;
  const errors = [];

  for (const config of configs) {
    try {
      const result = await readAllRows(config);
      config.connection_status = "connected";
      config.connection_error = null;
      config.last_sync_at = new Date();
      config.last_sync_count = result.total;
      config.total_senders = result.total;
      await config.save();
      totalRows += result.total;
      synced++;
    } catch (error) {
      config.connection_status = "failed";
      config.connection_error = error.message;
      await config.save();
      errors.push({ name: config.name, error: error.message });
    }
  }

  memoryCache = {
    syncedAt: Date.now(),
  };

  return {
    success: errors.length === 0,
    total: totalRows,
    synced,
    errors,
  };
}
