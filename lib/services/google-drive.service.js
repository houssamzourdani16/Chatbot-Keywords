// lib/services/google-drive.service.js
import "server-only";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import dbConnect from "@/lib/database/database";
import GoogleConnection from "@/lib/models/google-connection";

/**
 * ============================================
 * ✅ GOOGLE DRIVE SERVICE (OAuth 2.0)
 * ============================================
 *
 * Professional Google Sheets integration like
 * Zapier / Make / n8n. Uses OAuth 2.0 to let
 * admins browse their Google Drive, select a
 * spreadsheet, pick a sheet, preview data and
 * map columns.
 *
 * Requires env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI
 */

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * Build an OAuth2 client from a stored connection.
 */
function buildOAuthClient(connection) {
  const client = getOAuthClient();
  client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.expiry_date,
  });
  return client;
}

/**
 * Generate the Google OAuth authorization URL.
 * `state` encodes both the userId and an optional accountId.
 */
export function getAuthUrl(userId, accountId = "") {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: JSON.stringify({ userId, accountId }),
  });
}

/**
 * Exchange an authorization code for tokens and store them.
 * Supports adding MULTIPLE Google accounts per user.
 */
export async function handleOAuthCallback(code, state) {
  let userId = state;
  let accountId = null;
  try {
    const parsed = JSON.parse(state);
    userId = parsed.userId;
    accountId = parsed.accountId || null;
  } catch (e) {
    // state is just the userId (backwards compatible)
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch the user's Google profile
  let email = "";
  let name = "";
  let picture = "";
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const info = await oauth2.userinfo.get();
    email = info.data.email || "";
    name = info.data.name || "";
    picture = info.data.picture || "";
  } catch (e) {
    // Non-fatal
  }

  await dbConnect();

  // If we're re-connecting an existing account, update it.
  // Otherwise create a new connection for this email.
  const filter = accountId
    ? { _id: accountId, user_id: userId }
    : { user_id: userId, email };

  await GoogleConnection.findOneAndUpdate(
    filter,
    {
      user_id: userId,
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      scope: tokens.scope || "",
      token_type: tokens.token_type || "Bearer",
      expiry_date: tokens.expiry_date || null,
      name,
      picture,
      is_connected: true,
    },
    { upsert: true, new: true },
  );

  return { email, name, picture };
}

/**
 * Get ALL connected Google accounts for an admin user.
 */
export async function getConnections(userId) {
  await dbConnect();
  return GoogleConnection.find({ user_id: userId, is_connected: true }).lean();
}

/**
 * Get a single Google connection by id (must belong to the user).
 */
export async function getConnectionById(userId, connectionId) {
  await dbConnect();
  return GoogleConnection.findOne({
    _id: connectionId,
    user_id: userId,
    is_connected: true,
  });
}

/**
 * Get the stored Google connection for an admin user.
 * (Backwards compatible — returns the first/primary account.)
 */
export async function getConnection(userId) {
  await dbConnect();
  return GoogleConnection.findOne({ user_id: userId, is_connected: true });
}

/**
 * Disconnect (revoke) a specific Google connection.
 */
export async function disconnectGoogle(userId, connectionId) {
  await dbConnect();
  const filter = connectionId
    ? { _id: connectionId, user_id: userId }
    : { user_id: userId };
  const conn = await GoogleConnection.findOne(filter);
  if (conn) {
    conn.is_connected = false;
    await conn.save();
  }
  return true;
}

/**
 * Get an authenticated OAuth2 client for a specific connection,
 * refreshing the token if needed.
 */
async function getAuthenticatedClient(userId, connectionId) {
  const connection = connectionId
    ? await getConnectionById(userId, connectionId)
    : await getConnection(userId);

  if (!connection) {
    throw new Error("Google account not connected");
  }

  const client = buildOAuthClient(connection);

  // Refresh if expired
  if (connection.expiry_date && Date.now() >= connection.expiry_date) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    connection.access_token = credentials.access_token;
    connection.expiry_date = credentials.expiry_date || null;
    await connection.save();
  }

  return client;
}

/**
 * List all spreadsheets in a specific Google account's Drive.
 */
export async function listSpreadsheets(userId, query = "", connectionId) {
  try {
    const auth = await getAuthenticatedClient(userId, connectionId);
    const drive = google.drive({ version: "v3", auth });

    const q = [
      "mimeType='application/vnd.google-apps.spreadsheet'",
      "trashed=false",
    ];
    if (query) {
      q.push(`name contains '${query.replace(/'/g, "\\'")}'`);
    }

    const response = await drive.files.list({
      q: q.join(" and "),
      fields:
        "files(id, name, modifiedTime, webViewLink, iconLink, size, createdTime)",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    });

    return {
      success: true,
      files: response.data.files.map((file) => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink || "https://drive.google.com/icon/spreadsheet",
        size: file.size,
        createdTime: file.createdTime,
        url: `https://docs.google.com/spreadsheets/d/${file.id}`,
      })),
    };
  } catch (error) {
    console.error("Error listing spreadsheets:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all sheets within a spreadsheet (from a specific account).
 */
export async function getSheets(userId, spreadsheetId, connectionId) {
  try {
    const auth = await getAuthenticatedClient(userId, connectionId);
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });

    const result = response.data.sheets.map((sheet) => {
      const p = sheet.properties;
      return {
        id: p.sheetId,
        title: p.title,
        index: p.index,
        rowCount: p.gridProperties?.rowCount || 0,
        columnCount: p.gridProperties?.columnCount || 0,
        hidden: p.hidden || false,
      };
    });

    return { success: true, sheets: result, spreadsheetId };
  } catch (error) {
    console.error("Error getting sheets:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Preview sheet data (first 20 rows) from a specific account.
 */
export async function previewSheet(
  userId,
  spreadsheetId,
  sheetName,
  connectionId,
) {
  try {
    const auth = await getAuthenticatedClient(userId, connectionId);
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      majorDimension: "ROWS",
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const data = rows.slice(1, 21);

    return {
      success: true,
      headers,
      data,
      totalRows: rows.length,
      previewRows: data.length,
      columns: headers.map((header, index) => ({
        letter: String.fromCharCode(65 + index),
        name: header || `Column ${String.fromCharCode(65 + index)}`,
      })),
    };
  } catch (error) {
    console.error("Error previewing sheet:", error);
    return { success: false, error: error.message };
  }
}
