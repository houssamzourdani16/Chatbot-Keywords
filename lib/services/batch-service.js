// lib/services/batch-service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import Batch from "@/lib/models/batch";
import Message from "@/lib/models/message";

/**
 * ============================================
 * ✅ MESSAGE BATCHING SERVICE (Debounce)
 * ============================================
 *
 * How it works:
 *  1. A message arrives from a sender.
 *  2. We find (or create) an OPEN batch for that (product, sender).
 *  3. We RESET the batch's expires_at = now + waiting_time.
 *  4. We attach the message to the batch.
 *  5. If another message arrives from the SAME sender, we reset the
 *     timer again (debounce).
 *  6. When the timer expires (no new messages), a worker picks up the
 *     batch, joins all its messages, sends them, and marks it done.
 *
 * This is serverless-safe: the "timer" lives in MongoDB (expires_at),
 * not in memory, so it survives between requests.
 */

/**
 * Add a message to a (debounced) batch for a sender.
 * Returns the batch the message was attached to.
 */
export async function addMessageToBatch({
  user_id,
  product_id,
  sender_id,
  messageData,
  waiting_time = 7,
  incoming_message = "",
  detected_keywords = [],
  keyword_data = {},
}) {
  await dbConnect();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + waiting_time * 1000);

  // Try to find an existing OPEN batch for this (product, sender)
  let batch = await Batch.findOne({
    product_id,
    sender_id,
    status: "open",
  });

  if (!batch) {
    // ✅ If there's no OPEN batch, check if there's a RECENT batch for this
    //    sender that is still "processing" or "failed". We REUSE it (reset
    //    to open and extend the timer) so ALL messages from the same sender
    //    stay in ONE batch and are processed together.
    //
    //    - "processing": the previous batch hasn't finished sending yet, so
    //      the new message joins it.
    //    - "failed": the previous send FAILED (messages were NOT delivered),
    //      so we retry them together with the new message.
    //
    //    We do NOT reuse "completed" batches — those were already sent to
    //    n8n successfully, and reusing them would re-send old messages.
    const recentBatch = await Batch.findOne({
      product_id,
      sender_id,
      status: { $in: ["processing", "failed"] },
    }).sort({ created_at: -1 });

    if (recentBatch) {
      batch = recentBatch;
      batch.status = "open";
      batch.expires_at = expiresAt;
      batch.waiting_time = waiting_time;
      await batch.save();
    } else {
      // Create a new open batch
      batch = await Batch.create({
        user_id,
        product_id,
        sender_id,
        expires_at: expiresAt,
        waiting_time,
        status: "open",
      });
    }
  } else {
    // ✅ RESET the debounce timer based on the LATEST message from this
    //    sender. The batch processes `waiting_time` seconds after the
    //    most recent message arrives — so if the sender keeps messaging,
    //    the timer keeps extending until they stop.
    batch.expires_at = expiresAt;
    batch.waiting_time = waiting_time;
    await batch.save();
  }

  // Attach the message to this batch
  const message = await Message.create({
    user_id,
    product_id,
    sender_id,
    batch_id: batch._id,
    raw_data: messageData,
    mode: "prod",
    status: "received",
    // ✅ Per-message keyword detection (Step 5 of the spec)
    incoming_message,
    detected_keywords,
    keyword_data,
  });

  return { batch, message };
}

/**
 * Find all batches whose debounce timer has expired and are still open.
 * These are ready to be joined and sent.
 */
export async function getExpiredBatches(limit = 10) {
  await dbConnect();
  return Batch.find({
    status: "open",
    expires_at: { $lte: new Date() },
  })
    .sort({ expires_at: 1 })
    .limit(limit);
}

/**
 * Atomically claim a batch for processing (prevents double-sending).
 * Returns the batch if successfully claimed, or null if already claimed.
 */
export async function claimBatch(batchId) {
  await dbConnect();
  return Batch.findOneAndUpdate(
    { _id: batchId, status: "open" },
    { status: "processing", processing_started_at: new Date() },
    { new: true },
  );
}

/**
 * Extract the human-readable message text from a raw payload.
 * Supports:
 *   - Simple: { message: "hello" } or { text: "hello" }
 *   - Meta/Facebook: { entry: [{ messaging: [{ message: { text } }] }] }
 *     e.g. sender: { id: "28725092387097231" }
 * Always returns a STRING (never an object).
 */
export function extractMessageText(rawData) {
  if (!rawData || typeof rawData !== "object") return "";
  const text =
    rawData.message ||
    rawData.text ||
    rawData.entry?.[0]?.messaging?.[0]?.message?.text ||
    "";
  return typeof text === "string" ? text : "";
}

/**
 * Join all messages for a batch into a single conversation array.
 */
export async function getBatchMessages(batchId) {
  await dbConnect();
  return Message.find({ batch_id: batchId }).sort({ created_at: 1 });
}

/**
 * Build the joined conversation payload for a batch (does NOT delete).
 * All messages belong to the SAME sender_id (the batch is keyed on
 * product_id + sender_id), so this is the full joined conversation for
 * that sender.
 */
export async function getBatchConversation(batchId) {
  await dbConnect();
  const messages = await getBatchMessages(batchId);

  return messages.map((m) => {
    // ✅ Always produce a clean STRING for the message text.
    const text =
      (typeof m.incoming_message === "string" ? m.incoming_message : "") ||
      extractMessageText(m.raw_data) ||
      "";
    return {
      sender_id: m.sender_id,
      message: text,
      platform: m.raw_data?.platform || null,
      received_at: m.created_at,
      // ✅ Per-message keyword info (Step 5 storage)
      incoming_message: text,
      detected_keywords: m.detected_keywords || [],
      keyword_data: m.keyword_data || {},
    };
  });
}

/**
 * Mark a batch as completed.
 * NOTE: Does NOT delete messages — deletion happens only after the
 * webhook send succeeds (see deleteBatchMessages).
 */
export async function completeBatch(batchId) {
  await dbConnect();

  // Mark batch as completed
  await Batch.findByIdAndUpdate(batchId, {
    status: "completed",
    processed_at: new Date(),
  });
}

/**
 * DELETE all messages for a batch after a successful webhook send.
 * Returns the list of deleted message ids (for logging).
 */
export async function deleteBatchMessages(batchId) {
  await dbConnect();

  // Find the messages first so we can log them
  const messages = await Message.find({ batch_id: batchId }).select("_id");

  const deletedIds = messages.map((m) => m._id);

  if (deletedIds.length > 0) {
    await Message.deleteMany({ batch_id: batchId });
  }

  return deletedIds;
}

/**
 * Mark all messages in a batch as completed after a successful webhook send.
 * KEEPS the messages in the DB so the dashboard analytics can count them
 * (total messages, success rate, recent webhook calls, etc.).
 */
export async function completeBatchMessages(batchId) {
  await dbConnect();
  return Message.updateMany(
    { batch_id: batchId },
    { status: "completed", processed_at: new Date() },
  );
}

/**
 * Mark all messages in a batch as failed (kept in DB for retry/debug).
 * Used when the webhook send fails.
 */
export async function failBatchMessages(batchId) {
  await dbConnect();
  return Message.updateMany(
    { batch_id: batchId },
    { status: "failed", processed_at: new Date() },
  );
}

/**
 * Mark a batch as failed (e.g. webhook send failed).
 */
export async function failBatch(batchId) {
  await dbConnect();
  return Batch.findByIdAndUpdate(
    batchId,
    { status: "failed", processed_at: new Date() },
    { new: true },
  );
}

/**
 * Self-healing: find batches stuck in "processing" for too long (likely a
 * serverless function died mid-processing) and reset them back to "open"
 * so they can be claimed and retried. Returns the recovered batch ids.
 *
 * @param {number} staleMs - How long a processing batch must have been
 *   "processing" before it's considered stuck. Defaults to 60s.
 */
export async function recoverStuckProcessingBatches(staleMs = 60000) {
  await dbConnect();
  const cutoff = new Date(Date.now() - staleMs);

  // First pass: fetch candidate "processing" batches. We then check the
  // real timestamp below (processing_started_at, else created_at).
  const stuck = await Batch.find({
    status: "processing",
  });

  const recovered = [];
  for (const b of stuck) {
    const isConfirmedStuck =
      (b.processing_started_at &&
        new Date(b.processing_started_at).getTime() < cutoff.getTime()) ||
      (!b.processing_started_at &&
        b.created_at &&
        new Date(b.created_at).getTime() < cutoff.getTime());

    if (!isConfirmedStuck) continue;

    await Batch.updateOne(
      { _id: b._id, status: "processing" },
      {
        status: "open",
        $unset: { processing_started_at: 1 },
      },
    );
    recovered.push(b._id);
    console.log(`🔄 Recovered stuck processing batch ${b._id}`);
  }
  return recovered;
}
