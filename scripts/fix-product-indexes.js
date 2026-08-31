/**
 * scripts/fix-product-indexes.js
 * ============================================
 * ✅ FIX MongoDB duplicate key error (11000) on webhook_url: null
 * ============================================
 *
 * PROBLEM:
 *   Your Product schema has `unique: true` on api_key, webhook_url,
 *   and webhook_url_test. You added `sparse: true` to the schema, but
 *   MongoDB only applies `sparse` to NEW indexes. The OLD non-sparse
 *   unique indexes created earlier are still in the database, so saving
 *   a product with `webhook_url: null` throws error 11000.
 *
 * SOLUTION:
 *   Run this script ONCE. It will:
 *     1. Connect to MongoDB
 *     2. Drop the stale non-sparse unique indexes
 *     3. Rebuild them as sparse unique indexes
 *     4. Verify the final index state
 *
 * USAGE:
 *   node scripts/fix-product-indexes.js
 *
 *   (Make sure MONGO_URI is set in your environment / .env file)
 */

const mongoose = require("mongoose");

// Load .env.local (or .env) manually (no dotenv dependency needed)
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "..", ".env.local");
const envFallbackPath = path.resolve(__dirname, "..", ".env");
const envFile = fs.existsSync(envPath) ? envPath : envFallbackPath;
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Add it to your .env.local file.");
  process.exit(1);
}

// The fields that should be sparse unique indexes
const SPARSE_UNIQUE_FIELDS = ["api_key", "webhook_url", "webhook_url_test"];

async function fixIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected.\n");

    const collection = mongoose.connection.collection("products");
    const indexes = await collection.indexes();

    console.log("📋 Current indexes:");
    for (const index of indexes) {
      console.log(
        `   - ${index.name}: ${JSON.stringify(index.key)}` +
          (index.unique ? " [unique]" : "") +
          (index.sparse ? " [sparse]" : ""),
      );
    }
    console.log("");

    // 1. Drop stale non-sparse unique indexes
    for (const index of indexes) {
      const fields = Object.keys(index.key);
      const isSparse = index.sparse === true;

      if (
        !isSparse &&
        index.unique &&
        fields.some((f) => SPARSE_UNIQUE_FIELDS.includes(f))
      ) {
        console.log(`🗑️  Dropping stale index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }

    // 2. Rebuild as sparse unique indexes
    for (const field of SPARSE_UNIQUE_FIELDS) {
      console.log(`🔨 Creating sparse unique index on: ${field}`);
      await collection.createIndex(
        { [field]: 1 },
        { unique: true, sparse: true, name: `${field}_1` },
      );
    }

    // 3. Verify final state
    console.log("\n📋 Final indexes:");
    const finalIndexes = await collection.indexes();
    for (const index of finalIndexes) {
      console.log(
        `   - ${index.name}: ${JSON.stringify(index.key)}` +
          (index.unique ? " [unique]" : "") +
          (index.sparse ? " [sparse]" : ""),
      );
    }

    console.log("\n✅ Done! Stale indexes fixed.");
  } catch (error) {
    console.error("❌ Error fixing indexes:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixIndexes();
