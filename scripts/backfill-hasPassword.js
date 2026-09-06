// scripts/backfill-hasPassword.js
// One-time backfill to set the `hasPassword` flag correctly for ALL users,
// based on whether they have a REAL bcrypt password (vs the google_ placeholder).
//
//   node scripts/backfill-hasPassword.js
//
// A real password is a bcrypt hash (starts with "$2"). Google-only accounts
// were created with a `google_<base64(email)>` placeholder, which is NOT a
// usable login password — those get hasPassword: false.
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env.local");
const envFile = fs.existsSync(envPath)
  ? envPath
  : path.resolve(__dirname, "..", ".env");
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

function isRealPassword(pw) {
  return typeof pw === "string" && pw.startsWith("$2");
}

mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 })
  .then(async () => {
    const users = mongoose.connection.collection("users");
    const all = await users.find({}).toArray();

    let updated = 0;
    let compared = 0;
    for (const u of all) {
      const real = isRealPassword(u.password);
      if (u.hasPassword !== real) {
        await users.updateOne({ _id: u._id }, { $set: { hasPassword: real } });
        updated++;
      }
      compared++;
    }

    console.log(`📦 Scanned ${compared} user(s)`);
    console.log(
      `✅ Updated hasPassword for ${updated} user(s) (the rest were already correct).`,
    );
    await mongoose.disconnect();
  })
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  });
