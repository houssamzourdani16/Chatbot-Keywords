// lib/utils/google-auth.js
import "server-only";
import { google } from "googleapis";

/**
 * Build a Google Sheets auth client from service account credentials.
 * This is the MANUAL authentication method (no OAuth).
 */
export function buildServiceAccountAuth(serviceAccountEmail, privateKey) {
  const credentials = {
    client_email: serviceAccountEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Validate that the credentials look correct before attempting auth.
 * Returns { valid, error? }
 */
export function validateCredentials(serviceAccountEmail, privateKey) {
  if (!serviceAccountEmail || !serviceAccountEmail.includes("@")) {
    return { valid: false, error: "Invalid service account email format" };
  }
  if (!privateKey || !privateKey.includes("PRIVATE KEY")) {
    return { valid: false, error: "Invalid private key format" };
  }
  return { valid: true };
}

/**
 * Get a Google Sheets client from credentials.
 */
export function getSheetsClient(serviceAccountEmail, privateKey) {
  const auth = buildServiceAccountAuth(serviceAccountEmail, privateKey);
  return google.sheets({ version: "v4", auth });
}
