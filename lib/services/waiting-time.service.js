// lib/services/waiting-time.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import Setting from "@/lib/models/setting";

/**
 * ============================================
 * ✅ WAITING TIME SERVICE
 * ============================================
 *
 * Centralizes how the "webhook" group settings are read so the
 * Settings page values actually take effect:
 *
 *   default_waiting_time (s) — the default debounce window used when a
 *                              product has NO explicit waiting_time set.
 *   max_waiting_time (s)     — an upper bound for any waiting_time.
 *
 * These two values are wired into:
 *   1. Product creation (as the default when the form omits it).
 *   2. The webhook routes (as the fallback when product.waiting_time is
 *      missing) and to clamp the value to the configured max.
 *
 * All values are in SECONDS.
 */

const DEFAULT = 7;
const MAX = 30;

/**
 * Read the effective default + max waiting time from the Settings.
 * Falls back to sane constants when no settings are stored.
 *
 * Returns a plain object:
 *   { defaultSeconds, maxSeconds }
 */
export async function getWaitingTimeSettings() {
  try {
    await dbConnect();
    const settings = await Setting.find({}).lean();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    let defaultSeconds = parseInt(map["default_waiting_time"], 10);
    if (!Number.isFinite(defaultSeconds) || defaultSeconds < 1) {
      defaultSeconds = DEFAULT;
    }

    let maxSeconds = parseInt(map["max_waiting_time"], 10);
    if (!Number.isFinite(maxSeconds) || maxSeconds < 1) {
      maxSeconds = MAX;
    }

    // Max must always be at least the default.
    if (maxSeconds < defaultSeconds) maxSeconds = defaultSeconds;

    return { defaultSeconds, maxSeconds };
  } catch (error) {
    console.error("⚠️ getWaitingTimeSettings failed:", error.message);
    return { defaultSeconds: DEFAULT, maxSeconds: MAX };
  }
}

/**
 * Resolve a waiting_time to a final, validated value:
 *   - If none is provided, use the Settings default.
 *   - Clamp to [1, maxSeconds] from the Settings.
 */
export async function resolveWaitingTime(waiting_time, settingsOverride) {
  const settings = settingsOverride || (await getWaitingTimeSettings());
  let value = parseInt(waiting_time, 10);
  if (!Number.isFinite(value) || value < 1) {
    value = settings.defaultSeconds;
  }
  return Math.min(value, settings.maxSeconds);
}
