// lib/services/batch-scheduler.js
import "server-only";
import { processBatch } from "@/lib/services/batch-processor";

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

 * FALLBACKS:
 *   - The Vercel cron (`/api/batches/process` every minute) catches any
 *     batch that was missed (e.g. if the function was killed at the 10s limit).
 *   - `processBatch` re-reads `expires_at` so a newer message resettingthe
 *     timer simply causes the delayed call to skip the batch (debounce-safe).
 */

/**
 * Wait for the debounce window to expire, then process the batch directly.
 * Keeps the current function alive during the wait (works on serverless).
 */
export async function scheduleBatchProcessing(expiresAt, batchId) {
  try {
    const now = Date.now();
    const delay = Math.max(0, new Date(expiresAt).getTime() - now) + 1000;

    // ✅ Wait for the debounce window to expire (+1s buffer). This keeps
    //    the current function alive so the timer actually fires on serverless.

    await new Promise((resolve) => setTimeout(resolve, delay));

    // ✅ Process the batch DIRECTLY (in-process). This is reliable and
    //    doesn't depend on a separate HTTP call or knowing the deployed URL.

    await processBatch(batchId);
  } catch (error) {
    // Non-fatal:the Vercel cron will retry. Log and continue.

    console.error("⚠️ scheduleBatchProcessing failed:", error.message);
  }
}
