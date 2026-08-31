# 🔗 COMPLETE GUIDE: Link Google Sheets to Your SaaS Platform

This guide walks you through **everything** — from creating a Google Service Account to fetching keywords and using them in your product webhooks.

---

## 📚 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create Google Service Account](#2-create-google-service-account)
3. [Share Google Sheet](#3-share-google-sheet)
4. [Get Spreadsheet ID](#4-get-spreadsheet-id)
5. [Prepare Your Keyword Sheet](#5-prepare-your-keyword-sheet)
6. [Configure in Your App](#6-configure-in-your-app)
7. [Save Settings for Future Connections](#7-save-settings-for-future-connections)
8. [Fetch Keywords from Google Sheets](#8-fetch-keywords-from-google-sheets)
9. [Use Keywords in Product Webhook](#9-use-keywords-in-product-webhook)
10. [Test the Integration](#10-test-the-integration)
11. [Troubleshooting](#11-troubleshooting)
12. [Best Practices](#12-best-practices)

---

## 1️⃣ PREREQUISITES

### What You Need Before Starting:

| Requirement              | Description                                     | Where to Get It                                              |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------ |
| **Google Account**       | A Google account to access Google Cloud Console | [accounts.google.com](https://accounts.google.com)           |
| **Google Cloud Project** | A project to create the service account         | [console.cloud.google.com](https://console.cloud.google.com) |
| **A Google Spreadsheet** | The sheet containing your keywords              | [sheets.google.com](https://sheets.google.com)               |
| **Your App Running**     | The Next.js app running locally                 | `npm run dev`                                                |

> ⏱️ **Time needed:** ~15 minutes
> 💰 **Cost:** Free (Google Cloud free tier)

---

## 2️⃣ CREATE GOOGLE SERVICE ACCOUNT

A **Service Account** is a special "robot user" that lets your app access Google Sheets **without OAuth**. This is the manual method.

### Step 2.1: Open Google Cloud Console

1. Go to: **https://console.cloud.google.com/apis/credentials**
2. If prompted, **sign in** with your Google account.

### Step 2.2: Create a Project (if you don't have one)

1. Click the **project dropdown** at the top of the page.
2. Click **New Project**.
3. Name it (e.g. `darija-keywords`).
4. Click **Create**.
5. Wait a few seconds, then select your new project from the dropdown.

### Step 2.3: Enable the Google Sheets API

1. Go to: **https://console.cloud.google.com/apis/library/sheets.googleapis.com**
2. Click **Enable**.
3. _(Optional but recommended)_ Also enable the **Google Drive API**:
   - Go to: **https://console.cloud.google.com/apis/library/drive.googleapis.com**
   - Click **Enable**.

### Step 2.4: Create the Service Account

1. Go back to: **https://console.cloud.google.com/apis/credentials**
2. Click **+ Create Credentials** → **Service Account**.
3. Fill in:
   - **Service account name:** `darija-keywords`
   - **Service account ID:** auto-filled (e.g. `darija-keywords`)
   - **Description:** `Keywords for Darija AI`
4. Click **Create and Continue**.
5. On the "Grant this service account access" step, you can **skip** (click **Done**) — no roles needed for reading sheets.
6. Click **Done**.

### Step 2.5: Create a Key (JSON)

1. In the **Service Accounts** list, click on your service account (`darija-keywords`).
2. Go to the **Keys** tab.
3. Click **Add Key** → **Create New Key**.
4. Choose **JSON**.
5. Click **Create**.
6. A `.json` file downloads automatically (e.g. `darija-keywords-123456.json`).

### Step 2.6: Extract Your Credentials

Open the downloaded `.json` file. You need **two** values:

```json
{
  "type": "service_account",
  "project_id": "darija-keywords",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n",
  "client_email": "darija-keywords@darija-keywords.iam.gserviceaccount.com",
  "client_id": "1234567890",
  ...
}
```

| Value                     | What to Copy                                                               |
| ------------------------- | -------------------------------------------------------------------------- |
| **Service Account Email** | `client_email` → `darija-keywords@darija-keywords.iam.gserviceaccount.com` |
| **Private Key**           | `private_key` → the full text starting with `-----BEGIN PRIVATE KEY-----`  |

> ⚠️ **Keep the private key secret!** Never commit it to Git or share it publicly.

---

## 3️⃣ SHARE GOOGLE SHEET

This is the **MOST IMPORTANT STEP**. The service account is a separate "robot user" — you must give it access to your spreadsheet.

### Step 3.1: Open Your Spreadsheet

1. Go to **https://sheets.google.com**.
2. Open the spreadsheet that contains your keywords.

### Step 3.2: Share with the Service Account

1. Click the **Share** button (top-right corner).
2. In the "Add people and groups" field, paste your **Service Account Email**:
   ```
   darija-keywords@darija-keywords.iam.gserviceaccount.com
   ```
3. Set the permission to **Editor** (recommended) or at least **Viewer**.
4. Click **Send**.

> ✅ **Result:** The service account can now read your spreadsheet.
> ❌ **If you skip this step**, you'll get `"The caller does not have permission"` when testing.

---

## 4️⃣ GET SPREADSHEET ID

The **Spreadsheet ID** is a long string in your spreadsheet's URL.

### How to find it:

Look at your spreadsheet's URL:

```
https://docs.google.com/spreadsheets/d/1abc123def456xyz789/edit#gid=0
                                        └──────────┬──────────┘
                                            THIS is the ID
```

Copy the part between `/d/` and `/edit`:

```
1abc123def456xyz789
```

> 💡 The ID is **not** the sheet tab name. It identifies the whole spreadsheet file.

---

## 5️⃣ PREPARE YOUR KEYWORD SHEET

Your spreadsheet should have a clear structure so keywords can be read correctly.

### Recommended layout:

| A (Keyword) | B (Category) | C (Context/Meaning)   |
| ----------- | ------------ | --------------------- |
| salam       | greeting     | Used in conversations |
| labas       | greeting     | Response to salam     |
| wach        | question     | Asking a question     |
| bzf         | quantity     | Expressing "a lot"    |
| chhal       | question     | Asking "how much"     |

### Rules:

- **Column A** = the keyword (required)
- **Column B** = the category (optional, defaults to "Other")
- **Row 1** = optional header row (auto-detected and skipped)
- Each keyword should be on its own row

> 💡 You can add **definitions and meanings** later in column C — the system will read them once you map the columns.

---

## 6️⃣ CONFIGURE IN YOUR APP

Now enter the credentials in your app.

### Step 6.1: Open the Configuration Page

1. Log in as **Super Admin**.
2. Go to **Admin → Sheets Config** (or navigate to `/admin/google-sheets`).

### Step 6.2: Fill in the Form

| Field                     | What to Enter                           | Example                                                             |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| **Service Account Email** | `client_email` from the JSON            | `darija-keywords@darija-keywords.iam.gserviceaccount.com`           |
| **Private Key**           | `private_key` from the JSON (full text) | `-----BEGIN PRIVATE KEY-----\nMIIEvA...\n-----END PRIVATE KEY-----` |
| **Spreadsheet ID**        | The ID from the URL                     | `1abc123def456xyz789`                                               |
| **Sheet Name**            | The tab name                            | `Sheet1`                                                            |
| **Range**                 | The columns to read                     | `A:Z`                                                               |
| **Keyword Column**        | Column index for keywords (0 = A)       | `0`                                                                 |
| **Category Column**       | Column index for categories (1 = B)     | `1`                                                                 |

### Step 6.3: Test the Connection

1. Click **🔗 Test Connection**.
2. Watch the **7-step validation**:
   - ✅ Step 1: Required Fields
   - ✅ Step 2: Credentials Format
   - ✅ Step 3: Google Authentication
   - ✅ Step 4: Spreadsheet Access
   - ✅ Step 5: List Sheets
   - ✅ Step 6: Selected Sheet
   - ✅ Step 7: Read Data
3. If all 7 steps pass, your connection is **working**!

### Step 6.4: Save the Configuration

1. Click **💾 Save Configuration**.
2. The settings are now stored in your database.

---

## 7️⃣ SAVE SETTINGS FOR FUTURE CONNECTIONS

Your configuration is **saved automatically** in the database (`GoogleSheetsConfig` collection).

### What gets saved:

- Service account email
- Private key
- Spreadsheet ID
- Sheet name
- Range
- Column mapping
- Connection status
- Last sync time & count

### How to view saved settings:

1. Go to **Admin → Sheets Config**.
2. You'll see the **Configuration Status** card showing:
   - ✅ Connected status
   - 📄 Spreadsheet ID
   - 📋 Sheet name
   - 🔑 Keyword count
   - 🔄 Last sync time

### How to edit later:

1. Click **✏️ Edit Configuration**.
2. Update the fields.
3. Click **💾 Save Configuration** again.

> 💡 The private key is **not** shown again for security — you only re-enter it if you need to change it.

---

## 8️⃣ FETCH KEYWORDS FROM GOOGLE SHEETS

### Manual Sync

1. Go to **Admin → Sheets Config**.
2. Click **🔄 Sync Now**.
3. The system reads all keywords from your sheet and updates the stats.

### Automatic Sync (with cache)

The system uses a **5-minute cache**. When keywords are needed:

1. It checks the cache.
2. If fresh (< 5 min), it returns cached keywords (fast).
3. If stale, it re-reads from Google Sheets and updates the cache.

---

## 9️⃣ USE KEYWORDS IN PRODUCT WEBHOOK

Once keywords are synced, they're used in **product webhook detection**.

### How it works:

1. A customer sends a message to your product's webhook.
2. The batch processor joins messages into a conversation.
3. It extracts keywords from the conversation.
4. It looks up each keyword in your Google Sheet.
5. It sends the detected keywords to your n8n webhook.

### The webhook payload includes:

```json
{
  "keywords_detected": [
    { "keyword": "salam", "category": "greeting" },
    { "keyword": "wach", "category": "question" }
  ],
  "unfound_keywords": ["new_word_not_in_sheet"]
}
```

---

## 🔟 TEST THE INTEGRATION

### Test 1: Connection Test

1. Go to **Admin → Sheets Config**.
2. Click **🔗 Test Connection**.
3. All 7 steps should pass.

### Test 2: Sync Test

1. Click **🔄 Sync Now**.
2. The keyword count should update to match your sheet.

### Test 3: Webhook Test

1. Go to your **product** in the dashboard.
2. Click **🧪 Test Webhook**.
3. Check the n8n webhook received the conversation with `keywords_detected`.

---

## 1️⃣1️⃣ TROUBLESHOOTING

| Error                               | Cause                               | Fix                                                     |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| **"Invalid service account email"** | Wrong email format                  | Check `client_email` in the JSON                        |
| **"Invalid private key"**           | Key doesn't contain `PRIVATE KEY`   | Copy the full `private_key` value                       |
| **"Authentication failed"**         | Wrong credentials / API not enabled | Re-check credentials + enable Sheets API                |
| **"Cannot access spreadsheet"**     | **You forgot to share the sheet**   | Share the sheet with the service account email (Step 3) |
| **"Sheet not found"**               | Wrong sheet tab name                | Check the exact tab name (case-sensitive)               |
| **"No data read"**                  | Empty sheet or wrong range          | Make sure the sheet has data in the mapped columns      |
| **401 Unauthorized**                | Access token expired                | Log in again                                            |

---

## 1️⃣2️⃣ BEST PRACTICES

### Security

- 🔒 **Never commit** the private key to Git.
- 🔒 Use a **separate service account** per environment (dev/prod).
- 🔒 Grant **minimum access** (Viewer if you only read).

### Performance

- ⚡ Use the **cache** to avoid hitting Google API limits.
- ⚡ Sync keywords **once**, not on every request.

### Data Quality

- 📋 Keep a **consistent column structure** across sheets.
- 📋 Use **lowercase** keywords for easier matching.
- 📋 Add **categories** to organize keywords.

### Multiple Accounts

- 🔑 You can connect **multiple Google accounts** to use keywords from different sheets.
- 🔑 Each keyword list can point to a different spreadsheet.

---

## 🎉 DONE!

You've successfully:

1. ✅ Created a Google Service Account
2. ✅ Shared your spreadsheet with it
3. ✅ Entered credentials in the app
4. ✅ Saved settings for future connections
5. ✅ Fetched keywords from Google Sheets
6. ✅ Used keywords in product webhook detection

Your SaaS platform is now connected to Google Sheets! 🚀
