const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("No MONGO_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected");
  const Batch = mongoose.connection.collection("batches");
  const Message = mongoose.connection.collection("messages");
  const openBatches = await Batch.countDocuments({ status: "open" });
  const processingBatches = await Batch.countDocuments({
    status: "processing",
  });
  const completedBatches = await Batch.countDocuments({ status: "completed" });
  const failedBatches = await Batch.countDocuments({ status: "failed" });
  console.log(
    "BATCHES open:" +
      openBatches +
      " processing:" +
      processingBatches +
      " completed:" +
      completedBatches +
      " failed:" +
      failedBatches,
  );
  const receivedMessages = await Message.countDocuments({ status: "received" });
  console.log("MESSAGES received:" + receivedMessages);
  const recentOpen = await Batch.find({ status: "open" })
    .sort({ expires_at: 1 })
    .limit(5)
    .toArray();

  // ============================================
  // ✅ LIVE COUNTDOWN
  //    Refreshes every second, showing the exact
  //    remaining wait time for each open batch as
  //    it ticks down (5 → 4 → 3 → 2 → 1 → processing).
  //    Uses \r so each frame overwrites the last
  //    line instead of printing a new one.
  // ============================================
  if (recentOpen.length === 0) {
    console.log("\n⏳ No open batches waiting. Live countdown skipped.");
  } else {
    console.log(
      "\n⏳ Live countdown (refreshes every second — Ctrl+C to stop):\n",
    );
    while (true) {
      const now = Date.now();
      const lines = recentOpen.map((b) => {
        const expires = new Date(b.expires_at).getTime();
        const remainingMs = expires - now;
        const totalSeconds = Math.ceil(remainingMs / 1000);

        const sender = String(b.sender_id).slice(0, 28);
        const wid = String(b._id);

        // ⏱️ Format mm:ss (or just ss) depending on how long is left
        let timeLabel;
        if (totalSeconds <= 0) {
          timeLabel = "0s → processing";
        } else if (totalSeconds >= 60) {
          const m = Math.floor(totalSeconds / 60);
          const s = totalSeconds % 60;
          timeLabel = `${m}m ${s.toString().padStart(2, "0")}s`;
        } else {
          timeLabel = `${totalSeconds}s`;
        }

        // Build a bar showing how much of the wait is left
        const pct = Math.max(
          0,
          Math.min(1, remainingMs / (b.waiting_time * 1000)),
        );
        const barLen = 12;
        const filled = Math.round(pct * barLen);
        const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

        return `  ⏳ ${wid} | ${sender} | [${bar}] ${timeLabel}`;
      });

      // Overwrite the previous frame: move the cursor up to the start of
      // the countdown block, clear everything below it, then re-print.
      const up = `\x1b[${lines.length + 2}A`; // countdown lines + header + blank
      process.stdout.write(up + "\x1b[0J");
      console.log(lines.join("\n"));

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
