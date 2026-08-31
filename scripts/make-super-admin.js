// scripts/make-super-admin.js
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

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/make-super-admin.js <email>");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    const result = await mongoose.connection
      .collection("users")
      .updateOne({ email }, { $set: { role: "super_admin" } });
    console.log(
      `✅ Updated ${result.modifiedCount} user(s) to super_admin: ${email}`,
    );
    await mongoose.disconnect();
  })
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  });
