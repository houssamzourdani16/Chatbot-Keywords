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
  waiting_time = 5,
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
    // Create a new open batch
    batch = await Batch.create({
      user_id,
      product_id,
      sender_id,
      expires_at: expiresAt,
      waiting_time,
      status: "open",
    });
  } else {
    // ✅ RESET the debounce timer (new message arrived)
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
    { status: "processing" },
    { new: true },
  );
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
 */
export async function getBatchConversation(batchId) {
  await dbConnect();
  const messages = await getBatchMessages(batchId);

  return messages.map((m) => ({
    sender_id: m.sender_id,
    message: m.raw_data?.message || m.raw_data?.text || m.raw_data,
    platform: m.raw_data?.platform || null,
    received_at: m.created_at,
  }));
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
