// lib/services/conversation.service.js
import "server-only";
import dbConnect from "@/lib/database/database";
import Conversation from "@/lib/models/conversation";

/**
 * ============================================
 * ✅ CONVERSATION SERVICE (MongoDB)
 * ============================================
 *
 * Stores and retrieves the full conversation history per Sender ID
 * directly in MongoDB. Replaces the old Google Sheets archive.
 *
 *   - saveMessage()  → save one message for a sender
 *   - getBySender()  → get all past messages for a sender (oldest first)
 */

/**
 * Save a message to the conversation history for a sender.
 * Non-fatal: if this fails, the message is still processed.
 */
export async function saveMessage({
  user_id,
  product_id,
  sender_id,
  message,
  raw_data = null,
  mode = "prod",
}) {
  if (!sender_id || !message) return null;
  try {
    await dbConnect();
    return await Conversation.create({
      user_id,
      product_id,
      sender_id,
      message: String(message),
      raw_data,
      mode,
    });
  } catch (error) {
    console.error("⚠️ Failed to save conversation message:", error.message);
    return null;
  }
}

/**
 * Get the full conversation history for a sender (oldest first).
 * Returns { messages: string[], found, sender_id, sources }
 *
 * MERGES messages from BOTH the `conversations` collection AND the
 * `messages` collection (which stores every webhook message), dedupes
 * them, and returns ALL of them sorted oldest-first. This guarantees no
 * message is ever missed, even if a message was only saved to one place.
 */
export async function getBySender(senderId, { limit = 10000 } = {}) {
  if (!senderId) {
    return {
      messages: [],
      history: [],
      found: false,
      sender_id: senderId,
      sources: [],
    };
  }
  try {
    await dbConnect();

    // ✅ Source 1: conversations collection
    const convDocs = await Conversation.find({ sender_id: senderId })
      .sort({ created_at: 1 })
      .limit(limit)
      .lean();
    const convHistory = convDocs
      .map((d) => ({
        text: String(d.message || "").trim(),
        created_at: d.created_at,
      }))
      .filter((h) => h.text);

    // ✅ Source 2: messages collection (every webhook message)
    let msgHistory = [];
    try {
      const Message = (await import("@/lib/models/message")).default;
      const past = await Message.find({ sender_id: senderId })
        .sort({ created_at: 1 })
        .limit(limit)
        .lean();
      msgHistory = past
        .map((m) => ({
          text: String(
            m.incoming_message || m.raw_data?.message || m.raw_data?.text || "",
          ).trim(),
          created_at: m.created_at,
        }))
        .filter((h) => h.text);
    } catch (e) {
      console.error("⚠️ Failed to read messages fallback:", e.message);
    }

    // ✅ Merge ALL messages from BOTH sources (no dedup) so the AI in n8n
    //    receives EVERY message saved for this sender, including repeats.
    //    Order: conversations first (oldest-first), then messages.
    const history = [...convHistory, ...msgHistory];

    // ✅ Plain strings for n8n (backwards compatible — the AI prompt in n8n
    //    expects simple text, not objects).
    const messages = history.map((h) => h.text);

    return {
      messages,
      history,
      found: messages.length > 0,
      sender_id: senderId,
      sources: [
        { name: "Conversations", messages: convHistory.length },
        { name: "Messages", messages: msgHistory.length },
      ],
    };
  } catch (error) {
    console.error("⚠️ Failed to get conversation by sender:", error.message);
    return {
      messages: [],
      history: [],
      found: false,
      sender_id: senderId,
      sources: [],
    };
  }
}
