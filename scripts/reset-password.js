// scripts/reset-password.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
const newPassword = process.argv[3];
if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.js <email> <newPassword>");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 })
  .then(async () => {
    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await mongoose.connection
      .collection("users")
      .updateOne({ email }, { $set: { password: hashed } });
    console.log(
      `✅ Reset password for ${email}: ${result.modifiedCount} user(s) updated`,
    );
    await mongoose.disconnect();
  })
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  });
