// lib/services/batch-scheduler.js
import "server-only";
import { processBatch } from "@/lib/services/batch-processor";
import Batch from "@/lib/models/batch";

/**
 * ============================================
 * ✅ BATCH SCHEDULER (serverless-safe)
 * ============================================
 *
 * Schedules a batch to be processed after the product's wait time.
 *
 * WHY THIS IS RELIABLE ON VERCEL:
 *   - Vercel serverless functions are frozen as soon as the response is
 *     returned — so a plain fire-and-forget `setTimeout` in the webhook route
 *     NEVER fires.
 *   - Instead, we `await` the wait time INSIDE the webhook function (keeping
 *     it alive), then call `processBatch` DIRECTLY. This guarantees the batch
 *     is processed within the function's lifetime on any platform.

 * HOW IT WORKS:
 *   1. The webhook saves the message and returns the batch_id + expires_at.

 *   2. We compute the delay = expires_at - now (+1s buffer).
 *   3. We `await` that delay (keeping the current function alive), then call
 *      `processBatch(batchId)` directly.

 * DEBOUNCE-SAFE:
 *   - Before processing, we RE-READ the batch's CURRENT expires_at from the
 *     DB. If a newer message from the same sender reset the timer, we wait
 *     again for the FULL new debounce window. This guarantees the batch is
 *     only processed `waiting_time` seconds after the MOST RECENT message —
 *     so all messages from the same sender are grouped and sent together.

 * FALLBACKS:
 *   - The Vercel cron (`/api/batches/process` every minute) catches any
 *     batch that was missed (e.g. if the function was killed at the 10s limit).
 *   - `processBatch` re-reads `expires_at` so a newer message resetting the
 *     timer simply causes the delayed call to skip the batch (debounce-safe).
 */

/**
 * Wait for the debounce window to expire, then process the batch directly.
 * Keeps the current function alive during the wait (works on serverless).
 *
 * Re-reads the batch's CURRENT expires_at from the DB so that if a newer
 * message from the same sender reset the timer, we wait for the FULL new
 * window instead of firing early.
 */
export async function scheduleBatchProcessing(expiresAt, batchId) {
  try {
    // ✅ LOOP: keep waiting until the batch's timer has TRULY expired.
    //    Every time a new message from the same sender arrives, it resets
    //    the batch's expires_at in the DB. We re-read it on each loop
    //    iteration, so if the timer was reset, we keep waiting for the
    //    FULL new window. This guarantees ALL messages from the same
    //    sender are grouped into the batch before it is processed.
    let target = new Date(expiresAt).getTime();

    // Loop up to 120 times (max ~4 minutes) to keep waiting for new
    // messages that reset the timer.
    for (let i = 0; i < 120; i++) {
      // Re-read the batch's LATEST expires_at and status from the DB.
      try {
        const latest = await Batch.findById(batchId)
          .select("expires_at status")
          .lean();
        if (!latest) break; // batch gone — stop
        if (latest.status !== "open") break; // already claimed/processed — stop

        if (latest.expires_at) {
          const latestTime = new Date(latest.expires_at).getTime();
          if (latestTime > target) target = latestTime;
        }
      } catch (e) {
        // Non-fatal: fall back to the passed-in expiresAt
      }

      const now = Date.now();
      const remaining = target - now;

      // Timer has fully expired — stop waiting and process.
      if (remaining <= 0) break;

      // Wait a short slice (max 2s) then re-check. This keeps the loop
      // responsive to new messages that reset the timer.
      const waitMs = Math.min(remaining + 1000, 2000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    // ✅ FINAL RE-CHECK: only process if the batch is STILL open and the
    //    timer has truly expired. If a newer message reset the timer while
    //    we were looping, processBatch will skip it (debounce-safe).
    try {
      const final = await Batch.findById(batchId)
        .select("expires_at status")
        .lean();
      if (!final || final.status !== "open") return null;
      if (new Date(final.expires_at).getTime() > Date.now()) return null;
    } catch (e) {
      // Non-fatal
    }

    // ✅ Process the batch DIRECTLY (in-process). This is reliable and
    //    doesn't depend on a separate HTTP call or knowing the deployed URL.
    //    processBatch re-reads expires_at again, so if the timer was reset
    //    once more, it simply skips (debounce-safe).

    await processBatch(batchId);
  } catch (error) {
    // Non-fatal:the Vercel cron will retry. Log and continue.

    console.error("⚠️ scheduleBatchProcessing failed:", error.message);
  }
}
