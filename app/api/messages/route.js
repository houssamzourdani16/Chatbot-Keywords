// app/api/messages/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/database/database";
import Product from "@/lib/models/product";
import Message from "@/lib/models/message";
import Batch from "@/lib/models/batch";
import jwt from "jsonwebtoken";
import { getKeywordsForList } from "@/lib/services/keyword-list-service";
import { detectKeywordsInText } from "@/lib/services/keyword-detection.service";

// GET - Fetch the latest messages for the logged-in user across all their
// products, with live status. Used by the dashboard "Live Messages" panel.
export async function GET(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;
    const productId = searchParams.get("productId") || "";
    const status = searchParams.get("status") || "";
    const senderId = searchParams.get("senderId") || "";

    // Get the user's products (to map product_id -> name)
    const products = await Product.find({ user_id: decoded.userId })
      .select("_id name keyword_list_id waiting_time")
      .lean();
    const productIds = products.map((p) => p._id);
    const productMap = {};
    const productWaitMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p.name;
      productWaitMap[p._id.toString()] = p.waiting_time || 7;
    });

    // Build the message query
    const messageQuery = { user_id: decoded.userId };
    if (productId) {
      messageQuery.product_id = productId;
    } else if (productIds.length > 0) {
      messageQuery.product_id = { $in: productIds };
    }
    if (status) messageQuery.status = status;
    if (senderId) messageQuery.sender_id = { $regex: senderId, $options: "i" };

    const [messages, total] = await Promise.all([
      Message.find(messageQuery)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(messageQuery),
    ]);

    // ✅ Build a lookup of batch -> expires_at + sent_payload so the UI can
    //    show a live countdown (for received messages) and the full outgoing
    //    payload that was sent to n8n (for completed messages).
    const batchInfoMap = {};
    const batchIds = messages.map((m) => m.batch_id).filter(Boolean);
    if (batchIds.length > 0) {
      try {
        const batches = await Batch.find({ _id: { $in: batchIds } })
          .select("_id expires_at status sent_payload")
          .lean();
        batches.forEach((b) => {
          batchInfoMap[b._id.toString()] = {
            expires_at: b.expires_at,
            status: b.status,
            sent_payload: b.sent_payload || null,
          };
        });
      } catch (e) {
        // Non-fatal: countdown just won't show if batch lookup fails
      }
    }

    // ✅ Build a lookup of the FULL spreadsheet rows for each product's
    //    keyword list, so we can enrich every message's keyword_data with
    //    the complete row (all columns) even if it was stored with fewer.
    //    The lookup maps EVERY variant (darija, latin, wrongVariants,
    //    detection_words) to the same full row.
    const keywordRowsByProduct = {};
    const keywordListByProduct = {};
    for (const p of products) {
      if (!p.keyword_list_id) continue;
      try {
        const { keywords = [] } = await getKeywordsForList(
          p.keyword_list_id.toString(),
        );
        const map = {};
        keywords.forEach((k) => {
          const rowInfo = {
            keyword: k.keyword,
            category: k.category || "Other",
            row: Array.isArray(k.data) ? k.data : [],
            headers: k.headers || null,
          };
          // Map the main keyword (darija)
          const kw = String(k.keyword).toLowerCase().trim();
          if (kw) map[kw] = rowInfo;
          // Map latin + variant columns too
          if (Array.isArray(k.headers) && Array.isArray(k.data)) {
            k.headers.forEach((h, idx) => {
              const name = String(h).toLowerCase().trim();
              const cell = k.data[idx];
              if (
                name === "latin" ||
                name === "wrongvariants" ||
                name === "wrong_variants" ||
                name === "detection_words" ||
                name === "detectionwords" ||
                name === "synonyms" ||
                name === "synonym"
              ) {
                String(cell)
                  .toLowerCase()
                  .split(/[|•·,]/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 1)
                  .forEach((v) => {
                    map[v] = rowInfo;
                  });
              }
            });
          }
        });
        keywordRowsByProduct[p._id.toString()] = map;
        keywordListByProduct[p._id.toString()] = keywords;
      } catch (e) {
        // Non-fatal: skip products whose list fails to load
      }
    }

    const enriched = messages.map((m) => {
      const productKey = m.product_id?.toString();
      const rowsMap = keywordRowsByProduct[productKey] || {};
      const listKeywords = keywordListByProduct[productKey] || [];
      const batchInfo = m.batch_id
        ? batchInfoMap[m.batch_id.toString()] || null
        : null;

      // ✅ Determine the message text
      const messageText =
        m.raw_data?.message ||
        m.raw_data?.text ||
        m.incoming_message ||
        (typeof m.raw_data === "string" ? m.raw_data : "");

      // ✅ Re-detect keywords from the message text ALWAYS, so we catch
      //    keywords that per-message detection missed (e.g. "gaddach" in
      //    latin). Merge with any stored keywords to avoid losing data.
      let detected = m.detected_keywords || [];
      if (messageText && listKeywords.length > 0) {
        const result = detectKeywordsInText(messageText, listKeywords);
        const redetected = result.detected_keywords || [];
        // Merge: stored first, then any newly detected not already present
        const merged = [...detected];
        redetected.forEach((kw) => {
          if (!merged.includes(kw)) merged.push(kw);
        });
        detected = merged;
      }

      // ✅ Rebuild keyword_data with the FULL row for each detected keyword
      const keyword_data = {};
      detected.forEach((kw) => {
        const stored = m.keyword_data?.[kw] || {};
        const full = rowsMap[String(kw).toLowerCase().trim()] || {};
        keyword_data[kw] = {
          keyword: kw,
          category: full.category || stored.category || "Other",
          meaning: stored.meaning || "",
          priority: stored.priority || "Medium",
          language: stored.language || "Darija",
          // ✅ Prefer the full row from the sheet (all columns)
          row: full.row && full.row.length ? full.row : stored.row || [],
          headers: full.headers || stored.headers || null,
        };
      });

      return {
        id: m._id,
        batch_id: m.batch_id || null,
        batch_expires_at: batchInfo?.expires_at || null,
        batch_status: batchInfo?.status || null,
        sent_payload: batchInfo?.sent_payload || null,
        product_id: m.product_id,
        product_name: productMap[productKey] || "Unknown",
        waiting_time: productWaitMap[productKey] || 7,
        sender_id: m.sender_id,
        message: messageText,
        raw_data: m.raw_data || null,
        platform: m.raw_data?.platform || null,
        status: m.status,
        mode: m.mode,
        detected_keywords: detected,
        keyword_data,
        created_at: m.created_at,
      };
    });

    // Connection status: if we reached here, the DB is connected.
    return NextResponse.json({
      success: true,
      connected: true,
      db: "connected",
      count: enriched.length,
      messages: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", connected: false },
      { status: 500 },
    );
  }
}

// DELETE - Remove one or more messages (e.g. failed messages) for the
// logged-in user. Accepts a single message id or an array of ids.
export async function DELETE(request) {
  try {
    await dbConnect();

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? body.ids
      : body.id
        ? [body.id]
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No message ids provided" },
        { status: 400 },
      );
    }

    // Only delete messages that belong to this user.
    const result = await Message.deleteMany({
      _id: { $in: ids },
      user_id: decoded.userId,
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json(
      { error: "Failed to delete messages" },
      { status: 500 },
    );
  }
}
