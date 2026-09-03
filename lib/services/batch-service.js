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

  // ✅ CHECK IF SENDER ALREADY EXISTS IN SAVED MESSAGES
  // Quick lookup (lean, no hydration) to check if sender has any recent messages.
  // We look at the last 60 seconds (any status) so that even if the previous
  // batch was already processed/completed, a new message from the same sender
  // within a short window is still recognized as an EXISTING sender and grouped.
  // We only need the IDs and count, not the full documents.
  // This query is FAST and NON-BLOCKING so the webhook stays responsive.
  let existingMessages = [];
  try {
    existingMessages = await Message.find(
      {
        user_id,
        product_id,
        sender_id,
        // ✅ Look at ANY recent message (last 60s), regardless of status.
        //    This ensures messages arriving a few seconds apart are grouped
        //    together instead of being treated as separate/new senders.
        created_at: { $gte: new Date(Date.now() - 60_000) },
      },
      { _id: 1 }, // Only fetch IDs (minimal data)
    )
      .lean() // No Mongoose overhead
      .maxTimeMS(5000); // Fail fast if query takes too long
  } catch (e) {
    console.error("⚠️ Error checking existing messages:", e.message);
    // Continue anyway - treat as new sender if lookup fails
  }

  // ✅ Determine if this is a NEW sender or EXISTING sender
  const isExistingSender = existingMessages.length > 0;

  // Use product's configured wait time for consistency
  const finalWaitingTime = waiting_time;
  const finalExpiresAt = new Date(now.getTime() + finalWaitingTime * 1000);

  console.log(
    `📨 Sender ${sender_id}: ${isExistingSender ? "EXISTING" : "NEW"} | ` +
      `Existing messages: ${existingMessages.length} | ` +
      `Product: ${product_id} | User: ${user_id}`,
  );

  // ============================================
  // ✅ ATOMIC FIND-OR-CREATE of the OPEN batch.
  // ============================================
  // The Batch model has a PARTIAL UNIQUE index on
  //   { product_id, sender_id } WHERE status = "open"
  // so at most ONE open batch can exist per (product, sender) at a time.
  //
  // Using `findOneAndUpdate` with `upsert: true` makes the find-or-create
  // an ATOMIC operation. This is CRITICAL to prevent a race condition
  // where two webhook calls for the SAME sender both execute:
  //   1. findOne({ status: "open" })  → both miss
  //   2. create({...})                 → duplicate batches!
  //
  // That race was causing messages to be processed ONE BY ONE (each in
  // its OWN batch) instead of being joined together — because under a
  // flush of requests, multiple batches were created for one sender, each
  // carrying only a single message.
  //
  // Now, concurrent calls for the same (product, sender) both upsert onto
  // the SAME open batch doc, so every message lands in ONE batch and is
  // sent together to n8n. The batch's expires_at is RESET on every upsert
  // (true debounce), so it fires `waiting_time` seconds after the MOST
  // RECENT message.
  let result;
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      result = await Batch.findOneAndUpdate(
        {
          product_id,
          sender_id,
          status: "open",
        },
        {
          $setOnInsert: {
            user_id,
            product_id,
            sender_id,
            status: "open",
            // ✅ The wait time is set ONCE when the batch is first created for
            //    this sender. It is NOT overwritten by later messages, so ALL
            //    messages from the same sender share the SAME wait time — even
            //    if the product's waiting_time setting changes mid-batch.
            waiting_time: finalWaitingTime,
          },
          // ✅ Reset the debounce timer on EVERY message.
          $set: {
            expires_at: finalExpiresAt,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      if (result) {
        break; // Success! Exit retry loop
      }
    } catch (err) {
      retries++;

      if (retries >= maxRetries) {
        // Final attempt: manually fetch the existing batch
        console.warn(
          `⚠️ Batch upsert failed ${retries} times, attempting manual fetch for ` +
            `product_id=${product_id}, sender_id=${sender_id}`,
        );

        const existing = await Batch.findOne({
          product_id,
          sender_id,
          status: "open",
        });

        if (existing) {
          result = await Batch.findOneAndUpdate(
            { _id: existing._id, status: "open" },
            { $set: { expires_at: finalExpiresAt } },
            { new: true },
          );
          break;
        } else {
          throw err;
        }
      }

      // Brief pause before retry (exponential backoff)
      const waitMs = Math.min(10 * Math.pow(2, retries), 100);
      await new Promise((resolve) => setTimeout(resolve, waitMs));

      console.log(
        `🔄 Batch upsert retry ${retries}/${maxRetries} for sender ${sender_id}`,
      );
    }
  }

  // A batch must always exist here (upsert guarantees it).
  const batch = result;

  console.log(
    `✅ Batch ${batch._id} (${isExistingSender ? "REUSED" : "CREATED"}) | ` +
      `expires_at: ${finalExpiresAt.toISOString()} | ` +
      `waiting_time: ${finalWaitingTime}s`,
  );

  // ✅ If this is an EXISTING sender, update ALL their existing messages
  // to have the same wait_time (reset based on product config)
  // NOTE: This runs in PARALLEL with message creation (non-blocking).
  if (isExistingSender && existingMessages.length > 0) {
    // Fire-and-forget: Don't await, let this update in background
    // while we continue to create the new message and return to webhook client.
    Message.updateMany(
      {
        _id: { $in: existingMessages.map((m) => m._id) },
      },
      {
        $set: {
          waiting_time: finalWaitingTime,
        },
      },
    )
      .then(() => {
        console.log(
          `🔄 Reset waiting_time to ${finalWaitingTime}s for ${existingMessages.length} existing messages from sender ${sender_id}`,
        );
      })
      .catch((e) => {
        console.error("⚠️ Error updating existing messages:", e.message);
        // Non-fatal: continue anyway
      });
  }

  // Attach the NEW message to this batch
  const message = await Message.create({
    user_id,
    product_id,
    sender_id,
    batch_id: batch._id,
    raw_data: messageData,
    mode: "prod",
    status: "received",
    // ✅ Use the product's configured waiting_time for ALL messages.
    //    When new message arrives from same sender:
    //    - All existing messages get updated to THIS wait time
    //    - New message gets THIS wait time
    //    - All messages in batch expire at same time
    //    - All sent to n8n together
    waiting_time: finalWaitingTime,
    // ✅ Per-message keyword detection
    incoming_message,
    detected_keywords,
    keyword_data,
  });

  console.log(
    `✅ New message from sender ${sender_id} created` +
      ` | batch: ${batch._id}` +
      ` | waiting_time: ${finalWaitingTime}s` +
      ` | expires_at: ${batch.expires_at}` +
      (isExistingSender ? ` | RESET existing messages ✓` : ` | NEW sender`),
  );

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
